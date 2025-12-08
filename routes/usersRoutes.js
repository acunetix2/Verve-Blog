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
    const user = await Users.findOne({ email });
    if (!user) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const isMatch = await user.comparePassword(password);
    if (!isMatch) return res.status(401).json({ success: false, message: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, role: "user" }, process.env.JWT_SECRET, {
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
router.put("/me", authMiddleware, upload.single("avatar"), async (req, res) => {
  try {
    const { name, email } = req.body;
    const updateData = { name, email };

    // Upload avatar to Cloudinary if provided
    if (req.file) {
      const result = await cloudinary.uploader.upload_stream(
        { folder: "avatars" },
        async (error, result) => {
          if (error) {
            console.error(error);
            return res.status(500).json({ message: "Avatar upload failed" });
          }
          updateData.avatar = result.secure_url;

          const updatedUser = await Users.findByIdAndUpdate(req.user.id, updateData, { new: true }).select("-password");
          res.json(updatedUser);
        }
      );

      // Pipe the uploaded buffer to Cloudinary
      result.end(req.file.buffer);
    } else {
      const updatedUser = await Users.findByIdAndUpdate(req.user.id, updateData, { new: true }).select("-password");
      res.json(updatedUser);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Profile update failed" });
  }
});

// ------------------ CHANGE PASSWORD ------------------
router.put("/me/password", authMiddleware, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await Users.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) return res.status(400).json({ message: "Current password is incorrect" });

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (err) {
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

export default router;