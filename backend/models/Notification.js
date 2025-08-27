import mongoose from "mongoose";

const NotificationSchema = new mongoose.Schema({
    // Para quem é a notificação
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    // Quem originou a notificação
    sender: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    // Tipo da notificação
    type: { type: String, enum: ["FRIEND_REQUEST", "FRIEND_ACCEPT", "LIKE", "COMMENT", "NEW_MESSAGE"], required: true },
    // ID do Post (para curtidas e comentários)
    postId: { type: mongoose.Schema.Types.ObjectId, ref: "Post" },
    // Status de leitura
    read: { type: Boolean, default: false, index: true },
}, { timestamps: true });

export default mongoose.model("Notification", NotificationSchema);