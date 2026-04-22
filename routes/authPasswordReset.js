/**
 * Author / Copyright: Iddy
 * All rights reserved.
 */
 
import express from "express";
import crypto from "crypto";
import User from "../models/User.js";
import PasswordResetToken from "../models/PasswordResetToken.js";
import { passwordResetEmail, passwordResetText } from "../utils/emailTemplates.js";
import { sendEmail } from "../utils/sendEmail.js";
import logger from "../config/logger.js";

const router = express.Router();

console.log("✓ Resend API configured for password reset emails");

/* ---------------------------------------------------
   FORGOT PASSWORD
--------------------------------------------------- */
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const user = await User.findOne({ email });
    if (!user) {
      return res.json({ message: "If that email exists, a reset link was sent" });
    }

    // Generate reset token
    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    await PasswordResetToken.create({
      userId: user._id,
      token: hashedToken,
      expiresAt: Date.now() + 60 * 60 * 1000, 
    });

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${rawToken}&email=${email}`;

    // Send email using Resend API
    try {
      await sendEmail({
        to: email,
        subject: "Verve Hub Password Reset",
        html: passwordResetEmail(resetUrl),
        text: passwordResetText(resetUrl),
        replyTo: process.env.MAIL_FROM || "noreply@vervehub.com"
      });
      console.log(`Password reset email sent to ${email}`);
      res.json({ message: "Password reset link sent to email" });
    } catch (emailError) {
      console.error("Resend email error:", emailError.message);
      // Still return success to user for security (don't reveal if email exists)
      // But log the error for debugging
      logger.error("Failed to send password reset email", { 
        email, 
        error: emailError.message 
      });
      res.status(500).json({ 
        message: "Failed to send email. Please try again later or contact support." 
      });
    }
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

    // Hashing should happen in User model pre-save hook
    user.password = newPassword;
    await user.save();

    await PasswordResetToken.deleteMany({ userId: user._id });

    res.json({ message: "Password reset successful" });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
