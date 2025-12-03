import express from "express";
import crypto from "crypto";
import User from "../models/User.js";
import PasswordResetToken from "../models/PasswordResetToken.js";
import { passwordResetEmail } from "../utils/emailTemplates.js";
import sgMail from "@sendgrid/mail";

const router = express.Router();

// Set SendGrid API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

/* ---------------------------------------------------
   FORGOT PASSWORD
--------------------------------------------------- */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user)
      return res.json({ message: "If that email exists, a reset link was sent" });

    // Generate reset token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    await PasswordResetToken.create({
      userId: user._id,
      token: hashedToken,
      expiresAt: Date.now() + 60 * 60 * 1000, // 1 hour
    });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}&email=${email}`;

    // Send email using SendGrid
    const msg = {
      to: email,
      from: {
        email: process.env.MAIL_FROM, 
        name: "Verve Hub",
      },
      subject: "Verve Hub Password Reset",
      html: passwordResetEmail(resetUrl),
      replyTo: process.env.MAIL_FROM,
    };

    await sgMail.send(msg);

    res.json({ message: "Password reset link sent to email" });
  } catch (error) {
    console.error("Forgot password error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------------------------------------------
   RESET PASSWORD
--------------------------------------------------- */
router.post("/reset-password", async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid request" });

    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const tokenRecord = await PasswordResetToken.findOne({
      userId: user._id,
      token: hashedToken,
      expiresAt: { $gt: Date.now() },
    });

    if (!tokenRecord) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    user.password = newPassword; // Ensure your User model hashes passwords
    await user.save();

    await PasswordResetToken.deleteMany({ userId: user._id });

    res.json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
