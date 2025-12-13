import express from "express";
import Users from "../models/Users.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { authMiddleware } from "../middleware/auth.js";
import multer from "multer";
import path from "path";
import cloudinary from "../config/cloudinary.js"; // Cloudinary config

const router = express.Router();

// ------------------ MULTER SETUP FOR AVATAR UPLOADS ------------------
const storage = multer.memoryStorage(); // store file in memory
const upload = multer({ storage });

// ------------------ SIGNUP ------------------
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await Users.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email already in use" });
    }

    const user = new Users({ name, email, password });
    await user.save();

    const token = jwt.sign({ id: user._id, role: "user" }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({ success: true, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ------------------ LOGIN ------------------
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await Users.findOne({ email }).select("+password"); 
    if (!user) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    res.json({ success: true, token });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});


// ------------------ GET PROFILE ------------------
router.get("/profile", authMiddleware, async (req, res) => {
  try {
    const user = await Users.findById(req.user.id).select("-password");
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error" });
  }
});

// ------------------ GET CURRENT USER ------------------
router.get("/me", authMiddleware, async (req, res) => {
  try {
    const user = await Users.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});
router.get("/", async (req, res) => {
  const users = await Users.find().select("-password");
  res.json(users);
});


// ------------------ UPDATE PROFILE ------------------
router.put("/me", authMiddleware, upload.single("profileImage"), async (req, res) => {
  try {
    const { name, email } = req.body;
    const updateData = { name, email };

    // If avatar file exists, upload to Cloudinary
    if (req.file) {
      const uploaded = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "avatars" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(req.file.buffer);
      });

      updateData.profileImage = uploaded.secure_url; // ✅ Save to correct field
    }

    const updatedUser = await Users.findByIdAndUpdate(
      req.user.id,
      updateData,
      { new: true }
    ).select("-password");

    res.json(updatedUser);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Profile update failed" });
  }
});

// ------------------ CHANGE PASSWORD ------------------
router.put("/me/password", authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const user = await Users.findById(req.user.id).select("+password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    user.password = newPassword; // 👈 let pre-save hook hash it
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    console.error("Password update error:", err);
    res.status(500).json({ message: "Password update failed" });
  }
});


// ------------------ DELETE ACCOUNT ------------------
router.delete("/me", authMiddleware, async (req, res) => {
  try {
    await Users.findByIdAndDelete(req.user.id);
    res.json({ message: "Account deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Account deletion failed" });
  }
});

// ------------------ UPDATE PREFERENCES ------------------
router.put("/me/preferences", authMiddleware, async (req, res) => {
  try {
    const { emailNotifications, pushNotifications, language, timezone } = req.body;
    
    const user = await Users.findByIdAndUpdate(
      req.user.id,
      {
        preferences: {
          emailNotifications,
          pushNotifications,
          language,
          timezone
        }
      },
      { new: true }
    ).select("-password");

    res.json({ preferences: user.preferences });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to update preferences" });
  }
});

// ------------------ GET SESSIONS ------------------
router.get("/me/sessions", authMiddleware, async (req, res) => {
  try {
    // For now, return current session only
    // In a real app, you'd store sessions in Redis or DB
    const sessions = [
      {
        id: "current-session",
        device: "Current Device",
        browser: "Chrome",
        location: "Nairobi, Kenya",
        lastActive: "Just now",
        isCurrent: true
      }
    ];
    
    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch sessions" });
  }
});

// ------------------ REVOKE SESSION ------------------
router.delete("/me/sessions/:sessionId", authMiddleware, async (req, res) => {
  try {
    // In a real app, you'd delete the session from storage
    res.json({ message: "Session revoked successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to revoke session" });
  }
});

// ------------------ REVOKE ALL SESSIONS ------------------
router.delete("/me/sessions/all", authMiddleware, async (req, res) => {
  try {
    // In a real app, you'd delete all sessions except current
    res.json({ message: "All sessions revoked successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to revoke sessions" });
  }
});

export default router;