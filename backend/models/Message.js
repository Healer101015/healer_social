import mongoose from "mongoose";

const MessageSchema = new mongoose.Schema({
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    content: {
        type: String,
        default: ""
    },
    attachment: {
        type: String, // URL ou base64 da mídia
        default: null
    },
    attachmentType: {
        type: String, // 'image', 'video', 'audio'
        default: null
    },
    mimeType: {
        type: String, // Tipo MIME do arquivo (ex: image/jpeg, video/mp4)
        default: null
    },
    fileName: {
        type: String, // Nome original do arquivo
        default: null
    },
    fileSize: {
        type: Number, // Tamanho do arquivo em bytes
        default: null
    }
}, {
    timestamps: true
});

// Cria índices para otimizar a busca por mensagens entre dois usuários
MessageSchema.index({ sender: 1, recipient: 1 });
MessageSchema.index({ recipient: 1, sender: 1 });

export default mongoose.model("Message", MessageSchema);