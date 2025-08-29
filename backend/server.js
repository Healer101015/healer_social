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
import fs from "fs";

import Message from "./models/Message.js";
import Notification from "./models/Notification.js"; // Importar o modelo

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
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') ||
    file.mimetype.startsWith('video/') ||
    file.mimetype.startsWith('audio/')) {
    cb(null, true);
  } else {
    cb(new Error('Tipo de arquivo não suportado. Use imagem, vídeo ou áudio.'), false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter
});

const allowedOrigins = [
  "https://healer.japoneix.com",
  "http://healer.japoneix.com",
  "http://localhost:5173"
];

// Middlewares
app.use(cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
}));

app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use("/uploads", express.static(uploadsDir));

// Rotas
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/messages", messagesRoutes);

// Lista de usuários ativos
const activeUsers = new Map();

// Middleware JWT para Socket.IO
const authenticateToken = (socket, next) => {
  const token = socket.handshake.auth.token || socket.handshake.query.token;
  if (!token) return next(new Error("Authentication error: Token not provided"));

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");
    socket.userId = decoded.id;
    next();
  } catch {
    next(new Error("Authentication error: Invalid token"));
  }
};

io.use(authenticateToken);

// Eventos Socket.IO
io.on("connection", (socket) => {
  console.log(`[Socket.io] Conexão: Socket ID=${socket.id}, User ID=${socket.userId}`);
  activeUsers.set(socket.userId, socket.id);
  socket.join(`user_${socket.userId}`);

  // Envio de mensagem
  socket.on("sendMessage", async (data) => {
    const { recipientId, content, attachment, attachmentType, mimeType, fileName, fileSize, tempId } = data;

    if (!content?.trim() && !attachment) {
      socket.emit("messageError", { error: "Mensagem vazia", tempId });
      return;
    }

    try {
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

      await newMessage.populate('sender', 'name avatarUrl');
      await newMessage.populate('recipient', 'name avatarUrl');

      const messageData = newMessage.toObject();
      if (tempId) messageData.tempId = tempId;

      const recipientSocketId = activeUsers.get(recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("receiveMessage", messageData);
        // Criar e emitir notificação de nova mensagem
        const notification = await Notification.create({
          recipient: recipientId,
          sender: socket.userId,
          type: 'NEW_MESSAGE'
        });
        await notification.populate('sender', 'name avatarUrl');
        io.to(recipientSocketId).emit("new_notification", notification);
      }

      socket.emit("messageSent", messageData);
    } catch (error) {
      console.error("Erro ao enviar mensagem:", error.message);
      socket.emit("messageError", { error: "Failed to send message", tempId });
    }
  });

  // Evento typing
  socket.on('typing', (data) => {
    const { recipientId, isTyping } = data;
    const recipientSocketId = activeUsers.get(recipientId);
    if (recipientSocketId) {
      io.to(recipientSocketId).emit(isTyping ? 'userTyping' : 'userStopTyping', {
        userId: socket.userId,
        isTyping: isTyping || undefined
      });
    }
  });

  // Desconexão
  socket.on("disconnect", (reason) => {
    if (socket.userId) activeUsers.delete(socket.userId);
  });

  // Ping
  socket.on("ping", (callback) => { if (typeof callback === 'function') callback("pong"); });
});

// Rotas de upload de mídia
const handleUpload = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });

    let attachmentType;
    if (req.file.mimetype.startsWith('image/')) attachmentType = 'image';
    else if (req.file.mimetype.startsWith('video/')) attachmentType = 'video';
    else if (req.file.mimetype.startsWith('audio/')) attachmentType = 'audio';
    else {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ error: "Tipo de arquivo não suportado" });
    }

    res.json({
      fileUrl: `/uploads/${req.file.filename}`,
      attachmentType,
      mimeType: req.file.mimetype,
      fileName: req.file.originalname,
      fileSize: req.file.size
    });
  } catch (error) {
    console.error("Erro no upload:", error);
    res.status(500).json({ error: "Erro interno no servidor" });
  }
};

app.post("/api/upload-media", upload.single('media'), handleUpload);
app.post("/upload-media", upload.single('media'), handleUpload);

// Middleware de erro Multer
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: "Arquivo muito grande. Máx 10MB." });
  }
  res.status(400).json({ error: error.message });
});

// Health check
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

// Conexão MongoDB e start do servidor
mongoose.connect(MONGO_URI).then(() => {
  console.log("MongoDB conectado");
  server.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
}).catch(err => {
  console.error("Erro MongoDB:", err.message);
  process.exit(1);
});
