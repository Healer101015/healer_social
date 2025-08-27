import express from "express";
import Message from "../models/Message.js";
import { authRequired } from "./auth.js";

const router = express.Router();

router.post("/", authRequired, async (req, res) => {
    try {
        const { recipientId, content } = req.body;
        const senderId = req.userId;

        if (!recipientId || !content) {
            return res.status(400).json({ error: "Recipient ID and content are required." });
        }

        const newMessage = new Message({
            sender: senderId,
            recipient: recipientId,
            content: content,
        });

        await newMessage.save();

        res.status(201).json(newMessage);
    } catch (e) {
        res.status(500).json({ error: "Failed to send message." });
    }
});

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