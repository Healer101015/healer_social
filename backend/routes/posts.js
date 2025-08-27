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
    .populate("user", "name avatarUrl")
    .populate("comments.user", "name avatarUrl")
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
    res.json(await post.populate("user", "name avatarUrl"));
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// Like / unlike
router.post("/:id/like", authRequired, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });
  const has = post.likes.some(id => id.toString() === req.userId);
  if (has) {
    post.likes = post.likes.filter(id => id.toString() !== req.userId);
  } else {
    post.likes.push(req.userId);
  }
  await post.save();
  const populatedPost = await Post.findById(post._id)
    .populate("user", "name avatarUrl")
    .populate("comments.user", "name avatarUrl");
  res.json(populatedPost);
});

// Comment
router.post("/:id/comment", authRequired, async (req, res) => {
  const post = await Post.findById(req.params.id);
  if (!post) return res.status(404).json({ error: "Post not found" });
  const c = { user: req.userId, text: req.body.text };
  post.comments.push(c);
  await post.save();
  const populated = await Post.findById(post._id)
    .populate("user", "name avatarUrl")
    .populate("comments.user", "name avatarUrl");
  res.json(populated);
});

export default router;