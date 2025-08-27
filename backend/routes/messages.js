// backend/routes/messages.js
import express from "express";
import Message from "../models/Message.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();

// Rota para buscar o histórico de mensagens entre dois usuários
// Esta rota é uma API REST e é usada quando a página de chat é carregada
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


