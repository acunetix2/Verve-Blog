import jwt from "jsonwebtoken";
import Users from "../models/Users.js"; // Import your Users model

/**
 * Middleware to authenticate users using JWT
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
/**
 * Author / Copyright: Iddy
 * All rights reserved.
 */
export const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({ success: false, message: "No token provided" });
    }

    // Expecting format: "Bearer <token>"
    const tokenParts = authHeader.split(" ");
    if (tokenParts.length !== 2 || tokenParts[0] !== "Bearer") {
      return res.status(401).json({ success: false, message: "Malformed token" });
    }

    const token = tokenParts[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Attach decoded token to request
    req.user = decoded; // { id, role }

    // -------- ADD: EMAIL VERIFICATION CHECK --------
    const verifiedUser = await Users.findById(decoded.id).select(
      "emailVerified authProvider sessions"
    );

    if (!verifiedUser) {
      return res.status(401).json({ success: false, message: "User not found" });
    }

    // Block unverified LOCAL users
    if (
      verifiedUser.authProvider === "local" &&
      verifiedUser.emailVerified === false
    ) {
      return res.status(403).json({
        success: false,
        message: "Email not verified. Please verify your email to continue.",
      });
    }
    // -------- END ADD --------

    // --- Update session lastActive without altering current functionality ---
    try {
      if (verifiedUser.sessions && verifiedUser.sessions.length > 0) {
        const session = verifiedUser.sessions.find(s => s.isCurrent);
        if (session) {
          session.lastActive = new Date();
          await verifiedUser.save();
        }
      }
    } catch (err) {
      console.error("Failed to update session lastActive:", err);
      // Do NOT block authentication if this fails
    }

    next();
  } catch (err) {
    console.error("Auth Middleware Error:", err);
    return res.status(401).json({ success: false, message: "Invalid or expired token" });
  }
};

/**
 * Middleware to restrict access to admin users only
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
export const adminMiddleware = (req, res, next) => {
  try {
    if (!req.user || req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Forbidden: Admins only" });
    }
    next();
  } catch (err) {
    console.error("Admin Middleware Error:", err);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
