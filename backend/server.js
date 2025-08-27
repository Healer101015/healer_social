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
  console.log(`Usuário conectado: ${socket.id}`);

  const token = socket.handshake.query.token;
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.id;
      activeUsers.set(userId, socket.id);
    } catch (e) {
      socket.disconnect();
    }
  }

  socket.on("sendMessage", async ({ recipientId, content }) => {
    try {
      const senderId = [...activeUsers.entries()].find(([id, socketId]) => socketId === socket.id)?.[0];
      if (!senderId || !content.trim()) return;

      const newMessage = await Message.create({ sender: senderId, recipient: recipientId, content });

      const recipientSocketId = activeUsers.get(recipientId);
      if (recipientSocketId) {
        io.to(recipientSocketId).emit("receiveMessage", newMessage);
      }

      socket.emit("messageSent", newMessage);

    } catch (e) {
      console.error("Erro ao enviar mensagem:", e.message);
    }
  });

  socket.on("disconnect", () => {
    console.log("Usuário desconectado", socket.id);
    for (const [userId, socketId] of activeUsers.entries()) {
      if (socketId === socket.id) {
        activeUsers.delete(userId);
        break;
      }
    }
  });
});

app.get("/", (_req, res) => res.json({ ok: true, name: "Healer API" }));

mongoose.connect(MONGO_URI).then(() => {
  console.log("MongoDB connected");
  server.listen(PORT, () => console.log("Server at http://localhost:" + PORT));
}).catch(err => {
  console.error("MongoDB error:", err.message);
  process.exit(1);
});