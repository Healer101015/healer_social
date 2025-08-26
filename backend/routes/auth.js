import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";

const router = express.Router();
const sign = (id) => jwt.sign({ id }, process.env.JWT_SECRET || "dev_secret", { expiresIn: "7d" });

router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "Dados inválidos" });
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: "Email já cadastrado" });
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hash });
    res.json({ token: sign(user._id), user: { id: user._id, name: user.name, email: user.email, avatarUrl: user.avatarUrl } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ error: "Credenciais inválidas" });
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ error: "Credenciais inválidas" });
    res.json({ token: sign(user._id), user: { id: user._id, name: user.name, email: user.email, avatarUrl: user.avatarUrl } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
