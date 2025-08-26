import jwt from "jsonwebtoken";

export function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "Token required" });
  const token = header.split(" ")[1];
  try {
    const data = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");
    req.userId = data.id;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid token" });
  }
}
