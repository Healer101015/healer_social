import express from "express";
import multer from "multer";
import path from "path";
import mongoose from "mongoose";
import User from "../models/User.js";
import Post from "../models/Post.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "_" + Math.round(Math.random() * 1e9) + path.extname(file.originalname))
});
const upload = multer({ storage });

// get my profile
router.get("/me", authRequired, async (req, res) => {
  const me = await User.findById(req.userId).select("-password").lean();
  res.json(me);
});

// update profile (avatar, bio, cover photo)
router.post("/me", authRequired, upload.fields([{ name: 'avatar', maxCount: 1 }, { name: 'coverPhoto', maxCount: 1 }]), async (req, res) => {
  try {
    const updates = { bio: req.body.bio || "" };
    if (req.files.avatar) updates.avatarUrl = `/uploads/${req.files.avatar[0].filename}`;
    if (req.files.coverPhoto) updates.coverPhotoUrl = `/uploads/${req.files.coverPhoto[0].filename}`;

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
  const users = await User.find({ $or: [{ name: re }, { email: re }] }).select("name avatarUrl");
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

  // Incrementar visualização do perfil, exceto se for o próprio utilizador
  if (req.params.id !== req.userId) {
    await User.findByIdAndUpdate(req.params.id, { $inc: { profileViews: 1 } });
  }

  const user = await User.findById(req.params.id).select("-password");
  if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
  const posts = await Post.find({ user: user._id })
    .populate('repostOf') // Popular os dados do post original, se for partilha
    .populate({
      path: 'repostOf',
      populate: { path: 'user', select: 'name avatarUrl' } // Popular o utilizador do post original
    })
    .sort({ createdAt: -1 });

  res.json({ user, posts });
});

export default router;