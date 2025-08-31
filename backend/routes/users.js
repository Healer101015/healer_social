// backend/routes/users.js

import express from "express";
import multer from "multer";
import path from "path";
import mongoose from "mongoose";
import User from "../models/User.js";
import Post from "../models/Post.js";
import { authRequired } from "../middleware/auth.js";
import { upload, handleUpload } from "../utils/multer.js";

const router = express.Router();

// get my profile
router.get("/me", authRequired, async (req, res) => {
  const me = await User.findById(req.userId).select("-password").lean();
  res.json(me);
});

// update profile (avatar, bio, cover photo)
router.post("/me", authRequired, upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'coverPhoto', maxCount: 1 }]), handleUpload, async (req, res) => {
  try {
    const updates = { bio: req.body.bio || "" };
    if (req.files?.avatar?.[0]?.fileUrl) updates.avatarUrl = req.files.avatar[0].fileUrl;
    if (req.files?.coverPhoto?.[0]?.fileUrl) updates.coverPhotoUrl = req.files.coverPhoto[0].fileUrl;

    const me = await User.findByIdAndUpdate(req.userId, updates, { new: true }).select("-password");
    res.json(me);
  } catch (error) {
    res.status(500).json({ error: "Falha ao atualizar o perfil." });
  }
});


// simple search users by name/email
router.get("/search", authRequired, async (req, res) => {
  const q = req.query.q || "";
  const re = new RegExp(q, "i");
  // CORREÇÃO: Adicionado "_id" para consistência na busca
  const users = await User.find({ $or: [{ name: re }, { email: re }] }).select("name avatarUrl _id");
  res.json(users);
});

// send friend request
router.post("/:id/request", authRequired, async (req, res) => {
  if (req.params.id === req.userId) return res.status(400).json({ error: "Operação inválida" });
  const target = await User.findById(req.params.id);
  const me = await User.findById(req.userId);
  if (!target || !me) return res.status(404).json({ error: "Usuário não encontrado" });
  if (target.friendRequests.find(u => u.toString() === me._id.toString()) || target.friends.find(u => u.toString() === me._id.toString()))
    return res.json({ ok: true });
  target.friendRequests.push(me._id);
  await target.save();
  res.json({ ok: true });
});

// accept friend request
router.post("/:id/accept", authRequired, async (req, res) => {
  const from = await User.findById(req.params.id);
  const me = await User.findById(req.userId);
  if (!from || !me) return res.status(404).json({ error: "Usuário não encontrado" });
  me.friendRequests = me.friendRequests.filter(u => u.toString() !== from._id.toString());
  if (!me.friends.find(u => u.toString() === from._id.toString())) me.friends.push(from._id);
  if (!from.friends.find(u => u.toString() === me._id.toString())) from.friends.push(me._id);
  await me.save(); await from.save();
  res.json({ ok: true });
});

// get user public profile and posts
router.get("/:id", authRequired, async (req, res) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(404).json({ error: "Usuário não encontrado" });
  }

  if (req.params.id !== req.userId) {
    await User.findByIdAndUpdate(req.params.id, { $inc: { profileViews: 1 } });
  }

  const user = await User.findById(req.params.id)
    .select("-password")
    .populate("friends", "name avatarUrl _id");

  if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

  // --- BLOCO CORRIGIDO ---
  // Agora, os posts são populados com todas as informações necessárias do usuário
  const posts = await Post.find({ user: user._id })
    .populate("user", "name avatarUrl _id") // POPULA O AUTOR DO POST PRINCIPAL
    .populate("comments.user", "name avatarUrl _id")
    .populate("reactions.user", "name avatarUrl _id")
    .populate({
      path: 'repostOf',
      populate: [
        { path: 'user', select: 'name avatarUrl _id' },
        { path: 'reactions.user', select: 'name avatarUrl _id' },
        { path: 'comments.user', select: 'name avatarUrl _id' }
      ]
    })
    .sort({ createdAt: -1 });
  // --- FIM DO BLOCO CORRIGIDO ---

  res.json({ user, posts });
});

export default router;