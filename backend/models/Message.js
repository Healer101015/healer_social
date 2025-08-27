// backend/models/Message.js
import mongoose from "mongoose";

// O modelo da mensagem define como os dados são armazenados no MongoDB
const MessageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    content: { type: String, required: true },
}, { timestamps: true });

// Cria índices para otimizar a busca por mensagens entre dois usuários
MessageSchema.index({ sender: 1, recipient: 1 });
MessageSchema.index({ recipient: 1, sender: 1 });

export default mongoose.model("Message", MessageSchema);