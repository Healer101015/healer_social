import express from "express";
import multer from "multer";
import path from "path";
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

// update profile (avatar, bio)
router.post("/me", authRequired, upload.single("avatar"), async (req, res) => {
  const updates = { bio: req.body.bio || "" };
  if (req.file) updates.avatarUrl = `/uploads/${req.file.filename}`;
  const me = await User.findByIdAndUpdate(req.userId, updates, { new: true }).select("-password");
  res.json(me);
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
  const user = await User.findById(req.params.id).select("-password");
  if (!user) return res.status(404).json({ error: "Usuário não encontrado" });
  const posts = await Post.find({ user: user._id }).sort({ createdAt: -1 });
  res.json({ user, posts });
});

export default router;
