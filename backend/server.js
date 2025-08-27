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
import Message from "./models/Message.js";

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

// middlewares
app.use(cors());
app.use(morgan("dev"));
app.use(express.json({ limit: "10mb" }));
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// routes
app.use("/api/auth", authRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/users", userRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/messages", messagesRoutes);

const activeUsers = new Map();

io.on("connection", (socket) => {
  console.log(`[Socket.io] Conexão recebida. Socket ID: ${socket.id}`);

  const token = socket.handshake.query.token;
  if (!token) {
    console.log(`[Socket.io] Erro: Token de autenticação não fornecido. Desconectando socket ${socket.id}.`);
    socket.disconnect();
    return;
  }

  let userId;
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");
    userId = decoded.id;
    activeUsers.set(userId, socket.id);
    console.log(`[Socket.io] Token verificado. Usuário ID: ${userId} associado ao socket ID: ${socket.id}. Conexão bem-sucedida.`);
    console.log(`[Socket.io] Usuários ativos: ${Array.from(activeUsers.entries()).map(([id, socketId]) => `${id}:${socketId}`).join(', ')}`);
  } catch (e) {
    console.error(`[Socket.io] Erro de verificação do token para o socket ${socket.id}:`, e.message);
    socket.disconnect();
    return;
  }

  socket.on("sendMessage", async ({ recipientId, content, tempId }) => {
    console.log(`[Socket.io] 'sendMessage' de ${userId} para ${recipientId} -> "${content}"`);
    try {
      if (!userId || !content.trim()) {
        console.log("[Socket.io] Erro: remetente inválido ou conteúdo vazio.");
        return;
      }

      const newMessage = await Message.create({
        sender: userId,
        recipient: recipientId,
        content
      });

      // Adiciona o tempId se foi fornecido
      const messageWithTempId = newMessage.toObject();
      if (tempId) {
        messageWithTempId.tempId = tempId;
      }

      console.log(`[Socket.io] Mensagem salva. ID: ${newMessage._id}, TempID: ${tempId || 'N/A'}`);

      const recipientSocketId = activeUsers.get(recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("receiveMessage", messageWithTempId);
        console.log(`[Socket.io] Mensagem enviada em tempo real para destinatário ${recipientId} (Socket: ${recipientSocketId}).`);
      } else {
        console.log(`[Socket.io] Destinatário ${recipientId} não está conectado.`);
      }

      // sempre confirma para o remetente
      socket.emit("messageSent", messageWithTempId);
      console.log(`[Socket.io] Confirmação enviada para remetente ${userId}.`);

    } catch (e) {
      console.error("[Socket.io] Erro ao enviar mensagem:", e.message);
      // Envia erro para o cliente
      socket.emit("messageError", {
        error: "Failed to send message",
        tempId: tempId
      });
    }
  });

  socket.on("disconnect", (reason) => {
    console.log(`[Socket.io] Usuário desconectado. Socket ID: ${socket.id}. Razão: ${reason}`);
    if (userId) {
      activeUsers.delete(userId);
      console.log(`[Socket.io] Usuário ID: ${userId} removido dos usuários ativos.`);
      console.log(`[Socket.io] Usuários ativos restantes: ${Array.from(activeUsers.entries()).map(([id, socketId]) => `${id}:${socketId}`).join(', ')}`);
    }
  });

  // Evento para verificar status da conexão
  socket.on("ping", (callback) => {
    if (callback) callback("pong");
  });
});

// Rota de health check
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