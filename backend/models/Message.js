// backend/models/Message.js
import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
}, { timestamps: true });

// Adiciona um índice para otimizar buscas por conversas entre dois usuários
MessageSchema.index({ sender: 1, recipient: 1 });
MessageSchema.index({ recipient: 1, sender: 1 });

export default mongoose.model("Message", MessageSchema);