// backend/routes/messages.js
import express from "express";
import Message from "../models/Message.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();

// Rota para obter o histórico de mensagens entre dois usuários
router.get("/:userId", authRequired, async (req, res) => {
    try {
        const otherUserId = req.params.userId;
        const myUserId = req.userId;

        const messages = await Message.find({
            $or: [
                { sender: myUserId, recipient: otherUserId },
                { sender: otherUserId, recipient: myUserId },
            ],
        }).sort({ createdAt: 1 }); // Ordena por data de criação

        res.json(messages);
    } catch (err) {
        res.status(500).json({ error: "Erro ao buscar mensagens" });
    }
});

export default router;