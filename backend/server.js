import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import morgan from "morgan";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import http from "http";
import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import multer from "multer";
import Message from "./models/Message.js";
import fs from "fs";

import authRoutes from "./routes/auth.js";
import postRoutes from "./routes/posts.js";
import userRoutes from "./routes/users.js";
import notificationRoutes from "./routes/notifications.js";
import messagesRoutes from "./routes/messages.js";

dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"]
  }
});
const PORT = process.env.PORT || 4000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/healer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Garantir que o diretório de uploads existe
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configuração do Multer para upload de arquivos
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  // Permitir apenas imagens, vídeos e áudios
  if (file.mimetype.startsWith('image/') ||
    file.mimetype.startsWith('video/') ||
    file.mimetype.startsWith('audio/')) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não suportado. Use imagem, vídeo ou áudio.'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: fileFilter
});

// middlewares
app.use(cors());
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use("/uploads", express.static(uploadsDir));

// routes
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/messages", messagesRoutes);

const activeUsers = new Map();

// Middleware para verificar token JWT
const authenticateToken = (socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.query.token;
  if (!token) {
    return next(new Error("Authentication error: Token not provided"));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");
    socket.userId = decoded.id;
    next();
  } catch (error) {
    next(new Error("Authentication error: Invalid token"));
  }
};

io.use(authenticateToken);

io.on("connection", (socket) => {
  console.log(`[Socket.io] Conexão recebida. Socket ID: ${socket.id}, User ID: ${socket.userId}`);

  // Adiciona usuário à lista de ativos
  activeUsers.set(socket.userId, socket.id);
  console.log(`[Socket.io] Usuários ativos: ${Array.from(activeUsers.entries()).map(([id, socketId]) => `${id}:${socketId}`).join(', ')}`);

  // Join room do usuário
  socket.join(`user_${socket.userId}`);

  socket.on("sendMessage", async (data) => {
    const { recipientId, content, attachment, attachmentType, mimeType, fileName, fileSize, tempId } = data;

    console.log(`[Socket.io] 'sendMessage' de ${socket.userId} para ${recipientId} -> "${content}"`);

    try {
      if (!content?.trim() && !attachment) {
        console.log("[Socket.io] Erro: conteúdo vazio.");
        socket.emit("messageError", {
          error: "Mensagem vazia",
          tempId: tempId
        });
        return;
      }

      const newMessage = await Message.create({
        sender: socket.userId,
        recipient: recipientId,
        content: content?.trim() || "",
        attachment,
        attachmentType,
        mimeType,
        fileName,
        fileSize
      });

      // Popular dados do sender e recipient
      await newMessage.populate('sender', 'name avatarUrl');
      await newMessage.populate('recipient', 'name avatarUrl');

      const messageData = newMessage.toObject();
      if (tempId) {
        messageData.tempId = tempId;
      }

      console.log(`[Socket.io] Mensagem salva. ID: ${newMessage._id}, TempID: ${tempId || 'N/A'}`);

      // Enviar para o destinatário
      const recipientSocketId = activeUsers.get(recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("receiveMessage", messageData);
        console.log(`[Socket.io] Mensagem enviada em tempo real para destinatário ${recipientId} (Socket: ${recipientSocketId}).`);
      } else {
        console.log(`[Socket.io] Destinatário ${recipientId} não está conectado.`);
      }

      // Confirmar para o remetente
      socket.emit("messageSent", messageData);
      console.log(`[Socket.io] Confirmação enviada para remetente ${socket.userId}.`);

    } catch (error) {
      console.error("[Socket.io] Erro ao enviar mensagem:", error.message);
      socket.emit("messageError", {
        error: "Failed to send message",
        tempId: tempId
      });
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(`[Socket.io] Usuário desconectado. Socket ID: ${socket.id}, User ID: ${socket.userId}. Razão: ${reason}`);

    if (socket.userId) {
      activeUsers.delete(socket.userId);
      console.log(`[Socket.io] Usuário ID: ${socket.userId} removido dos usuários ativos.`);
      console.log(`[Socket.io] Usuários ativos restantes: ${Array.from(activeUsers.entries()).map(([id, socketId]) => `${id}:${socketId}`).join(', ')}`);
    }
  });

  socket.on("ping", (callback) => {
    if (typeof callback === 'function') {
      callback("pong");
    }
  });
});

// Rota de upload de mídia
app.post("/api/upload-media", upload.single('media'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }

    // Determinar o tipo de anexo com base no MIME type
    let attachmentType;
    if (req.file.mimetype.startsWith('image/')) {
      attachmentType = 'image';
    } else if (req.file.mimetype.startsWith('video/')) {
      attachmentType = 'video';
    } else if (req.file.mimetype.startsWith('audio/')) {
      attachmentType = 'audio';
    } else {
      // Se for um tipo não suportado, deletar o arquivo
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Tipo de arquivo não suportado" });
    }

    const fileUrl = `/uploads/${req.file.filename}`;

    res.json({
      fileUrl,
      attachmentType,
      mimeType: req.file.mimetype,
      fileName: req.file.originalname,
      fileSize: req.file.size
    });

  } catch (error) {
    console.error("Erro no upload:", error);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// Rota alternativa de upload (para compatibilidade)
app.post("/upload-media", upload.single('media'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Nenhum arquivo enviado" });
    }

    let attachmentType;
    if (req.file.mimetype.startsWith('image/')) {
      attachmentType = 'image';
    } else if (req.file.mimetype.startsWith('video/')) {
      attachmentType = 'video';
    } else if (req.file.mimetype.startsWith('audio/')) {
      attachmentType = 'audio';
    } else {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Tipo de arquivo não suportado" });
    }

    const fileUrl = `/uploads/${req.file.filename}`;

    res.json({
      fileUrl,
      attachmentType,
      mimeType: req.file.mimetype,
      fileName: req.file.originalname,
      fileSize: req.file.size
    });

  } catch (error) {
    console.error("Erro no upload:", error);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
});

// Middleware de erro para Multer
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: "Arquivo muito grande. O tamanho máximo é 10MB." });
    }
  }
  res.status(400).json({ error: error.message });
});

app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    activeUsers: Array.from(activeUsers.entries()).map(([id, socketId]) => ({ userId: id, socketId })),
    timestamp: new Date().toISOString()
  });
});

app.get("/", (_req, res) => res.json({
  ok: true,
  name: "Healer API",
  version: "1.0.0",
  socketIo: true
}));

mongoose.connect(MONGO_URI).then(() => {
  console.log("MongoDB connected");
  server.listen(PORT, () => console.log("Server at http://localhost:" + PORT));
}).catch(err => {
  console.error("MongoDB error:", err.message);
  process.exit(1);
});