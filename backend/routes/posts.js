// backend/routes/posts.js

import express from "express";
import multer from "multer";
import path from "path";
import Post from "../models/Post.js";
import { authRequired } from "../middleware/auth.js";

const router = express.Router();

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, Date.now() + "_" + Math.round(Math.random() * 1e9) + ext);
  }
});
const upload = multer({ storage });

// List feed (latest first)
router.get("/", authRequired, async (req, res) => {
  const posts = await Post.find()
    // CORREÇÃO: Adicionado "_id" em todas as seleções de campos de usuário
    .populate("user", "name avatarUrl _id")
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
    .sort({ createdAt: -1 })
    .limit(100);
  res.json(posts);
});

// Create post (with or without media)
router.post("/", authRequired, upload.single("media"), async (req, res) => {
  try {
    const { text } = req.body;
    const file = req.file;
    const mediaUrl = file ? `/uploads/${file.filename}` : "";
    const mediaType = file ? (file.mimetype.startsWith("video") ? "video" : "image") : "";
    const post = await Post.create({ user: req.userId, text: text || "", mediaUrl, mediaType });
    // CORREÇÃO: Adicionado "_id" para garantir consistência
    res.json(await post.populate("user", "name avatarUrl _id"));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Editar post
router.put("/:id", authRequired, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ error: "Post não encontrado" });
    if (post.user.toString() !== req.userId) return res.status(403).json({ error: "Não autorizado" });

    post.text = req.body.text || post.text;
    post.isEdited = true;
    await post.save();

    const populatedPost = await Post.findById(post._id)
      .populate("user", "name avatarUrl _id")
      .populate("comments.user", "name avatarUrl _id")
      .populate("reactions.user", "name avatarUrl _id");
    res.json(populatedPost);
  } catch (e) {
    res.status(500).json({ error: "Falha ao editar o post." });
  }
});

// Reagir a um post
router.post("/:id/react", authRequired, async (req, res) => {
  const { reactionType } = req.body;
  if (!['like', 'love', 'haha', 'sad'].includes(reactionType)) {
    return res.status(400).json({ error: "Tipo de reação inválida" });
  }

  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: "Post não encontrado" });

  const existingReactionIndex = post.reactions.findIndex(r => r.user.toString() === req.userId);

  if (existingReactionIndex > -1) {
    if (post.reactions[existingReactionIndex].type === reactionType) {
      post.reactions.splice(existingReactionIndex, 1);
    } else {
      post.reactions[existingReactionIndex].type = reactionType;
    }
  } else {
    post.reactions.push({ user: req.userId, type: reactionType });
  }

  await post.save();
  const populatedPost = await Post.findById(post._id)
    .populate("user", "name avatarUrl _id")
    .populate("comments.user", "name avatarUrl _id")
    .populate("reactions.user", "name avatarUrl _id");
  res.json(populatedPost);
});

// Partilhar um post
router.post("/:id/share", authRequired, async (req, res) => {
  try {
    const originalPost = await Post.findById(req.params.id);
    if (!originalPost) return res.status(404).json({ error: "Post original não encontrado" });

    const sharePost = await Post.create({
      user: req.userId,
      text: req.body.text || "",
      repostOf: originalPost._id,
    });

    const populatedShare = await sharePost.populate([
      { path: 'user', select: 'name avatarUrl _id' },
      {
        path: 'repostOf',
        populate: { path: 'user', select: 'name avatarUrl _id' }
      }
    ]);
    res.status(201).json(populatedShare);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Comment
router.post("/:id/comment", authRequired, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });
  const c = { user: req.userId, text: req.body.text };
  post.comments.push(c);
  await post.save();
  const populated = await Post.findById(post._id)
    .populate("user", "name avatarUrl _id")
    .populate("comments.user", "name avatarUrl _id")
    .populate("reactions.user", "name avatarUrl _id");
  res.json(populated);
});

export default router;