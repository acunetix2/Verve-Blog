/**
 * Author / Copyright: Iddy
 * All rights reserved.
 */

import express from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/User.js";
import passport from "passport";
import cookieParser from "cookie-parser";

dotenv.config();
const router = express.Router();


/* ---------------------------------------------------
   REGULAR SIGNUP
--------------------------------------------------- */
router.post("/signup", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ message: "Email already exists" });

    const user = await User.create({ email, password, role });

    res.status(201).json({
      message: "User created successfully",
      user: { id: user._id, email: user.email, role: user.role },
    });
  } catch (error) {
    console.error("Registration error:", error);
    res.status(400).json({ message: error.message });
  }
});

/* ---------------------------------------------------
   REGULAR LOGIN
--------------------------------------------------- */
router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });
    if (!user)
      return res.status(401).json({ message: "Invalid email or password" });

    const isMatch = await user.matchPassword(password);
    if (!isMatch)
      return res.status(401).json({ message: "Invalid email or password" });

    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "2h" }
    );

    res.json({
      message: "Login successful",
      token,
      user: { 
        _id: user._id, 
        email: user.email, 
        name: user.name || user.email,
        role: user.role,
        profileImage: user.profileImage,
        joinDate: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ message: "Server error" });
  }
});

/* ---------------------------------------------------
   VERIFY TOKEN
--------------------------------------------------- */
router.get("/verify", (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.json({ valid: false });

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    res.json({ valid: true, decoded });
  } catch (error) {
    res.json({ valid: false, message: error.message });
  }
});

/* ---------------------------------------------------
   CHANGE PASSWORD
--------------------------------------------------- */
router.post("/change-password", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const { newPassword } = req.body;
    if (!newPassword) {
      return res.status(400).json({ message: "New password is required" });
    }

    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.json({ message: "Password changed successfully" });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ message: "Failed to change password" });
  }
});

/* ---------------------------------------------------
   GOOGLE OAUTH ROUTES
--------------------------------------------------- */
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/" }),
  async (req, res) => {
    try {
      // Ensure emailVerified is true for Google users
      if (!req.user.emailVerified) {
        req.user.emailVerified = true;
        await req.user.save();
      }

      // Ensure user has avatar and name from Google profile (if not already set)
      if (!req.user.avatar) {
        req.user.avatar = req.user.avatar || "";
        await req.user.save();
      }

      const token = jwt.sign(
        { id: req.user._id, email: req.user.email, role: req.user.role },
        process.env.JWT_SECRET,
        { expiresIn: "2h" }
      );

      // Send both token and user object to frontend
      const frontendRedirect = `${process.env.FRONTEND_URL}/login?token=${token}&role=${req.user.role}`;

      // Optionally append user info as query (or just rely on frontend fetch after login)
      res.redirect(frontendRedirect);
    } catch (err) {
      console.error("Error generating token:", err);
      res.redirect("/");
    }
  }
);

/* ---------------------------------------------------
   GET CURRENT USER
--------------------------------------------------- */
router.get("/v", async (req, res) => {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ authenticated: false, message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ authenticated: false, message: "Invalid token format" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Fetch full user data from database
    const user = await User.findById(decoded.id).select("-password");
    
    if (!user) {
      return res.status(404).json({ authenticated: false, message: "User not found" });
    }

    res.json({ 
      authenticated: true, 
      user: {
        _id: user._id,
        email: user.email,
        name: user.name || user.email,
        role: user.role,
        joinDate: user.createdAt,
        posts: user.posts || 0,
        status: user.status || "active",
        profileImage: user.profileImage,
      }
    });
  } catch (err) {
    console.error("Error fetching user:", err);
    res.status(401).json({ authenticated: false, message: "Invalid token" });
  }
});

export default router;
