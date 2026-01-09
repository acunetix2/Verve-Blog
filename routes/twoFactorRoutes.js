import express from "express";
import speakeasy from "speakeasy";
import qrcode from "qrcode";
import User2FA from "../models/User2FA.js";
import User from "../models/User.js";
import jwt from "jsonwebtoken";

const router = express.Router();

// Middleware to check JWT and set req.userId
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Generate 2FA secret and QR code
router.post("/setup", auth, async (req, res) => {
  const user = await User.findById(req.userId);
  if (!user) return res.status(404).json({ message: "User not found" });
  const secret = speakeasy.generateSecret({ name: `Verve Blog (${user.email})` });
  await User2FA.findOneAndUpdate(
    { userId: user._id },
    { secret: secret.base32, enabled: false },
    { upsert: true }
  );
  const qr = await qrcode.toDataURL(secret.otpauth_url);
  res.json({ secret: secret.base32, qr });
});

// Verify 2FA code
router.post("/verify", auth, async (req, res) => {
  const { token } = req.body;
  const user2fa = await User2FA.findOne({ userId: req.userId });
  if (!user2fa) return res.status(404).json({ message: "2FA not setup" });
  const verified = speakeasy.totp.verify({
    secret: user2fa.secret,
    encoding: "base32",
    token
  });
  if (verified) {
    user2fa.enabled = true;
    await user2fa.save();
    return res.json({ verified: true });
  }
  res.status(400).json({ verified: false });
});

// Disable 2FA
router.post("/disable", auth, async (req, res) => {
  await User2FA.findOneAndUpdate({ userId: req.userId }, { enabled: false });
  res.json({ disabled: true });
});

// Check 2FA status
router.get("/status", auth, async (req, res) => {
  const user2fa = await User2FA.findOne({ userId: req.userId });
  res.json({ enabled: !!user2fa?.enabled });
});

export default router;
