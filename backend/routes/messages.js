// backend/routes/messages.js
import express from "express";
import multer from "multer";
import path from "path";
import Message from "../models/Message.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();

// Configuração do Multer para upload de arquivos
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) => cb(null, Date.now() + "_" + Math.round(Math.random() * 1e9) + path.extname(file.originalname))
});
const upload = multer({ storage });

// Rota para upload de mídia no chat
router.post('/media', authRequired, upload.single('media'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }
    const mediaUrl = `/uploads/${req.file.filename}`;
    let mediaType = 'image';
    if (req.file.mimetype.startsWith('video')) {
        mediaType = 'video';
    } else if (req.file.mimetype.startsWith('audio')) {
        mediaType = 'audio';
    }
    res.json({ mediaUrl, mediaType });
});

// Rota para buscar o histórico de mensagens entre dois usuários
router.get("/:recipientId", authRequired, async (req, res) => {
    try {
        const recipientId = req.params.recipientId;
        const userId = req.userId;

        const messages = await Message.find({
            $or: [
                { sender: userId, recipient: recipientId },
                { sender: recipientId, recipient: userId }
            ]
        }).sort({ createdAt: 1 });

        res.json(messages);
    } catch (e) {
        res.status(500).json({ error: "Failed to fetch messages." });
    }
});

export default router;