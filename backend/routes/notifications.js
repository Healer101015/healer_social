import express from "express";
import { authRequired } from "../middleware/auth.js";
import Notification from "../models/Notification.js";

const router = express.Router();

// Buscar notificações do usuário logado
router.get("/", authRequired, async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.userId })
            .populate("sender", "name avatarUrl")
            .sort({ createdAt: -1 })
            .limit(20);
        res.json(notifications);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// Marcar todas as notificações como lidas
router.post("/read", authRequired, async (req, res) => {
    try {
        await Notification.updateMany(
            { recipient: req.userId, read: false },
            { $set: { read: true } }
        );
        res.json({ ok: true });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

export default router;