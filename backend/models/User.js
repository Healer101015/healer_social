import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  avatarUrl: { type: String, default: "" },
  coverPhotoUrl: { type: String, default: "" }, // NOVO: Foto de capa
  bio: { type: String, default: "" },
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
  profileViews: { type: Number, default: 0 }, // NOVO: Contador de visualizações
}, { timestamps: true });

export default mongoose.model("User", UserSchema);