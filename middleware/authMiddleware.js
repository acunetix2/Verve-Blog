/**
 * Author / Copyright: Iddy
 * All rights reserved.
 */

import jwt from "jsonwebtoken";
import User from "../models/Users.js"; // ⚠️ ensure correct filename

export const protect = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "⚠️ No token provided" });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res
          .status(401)
          .json({ message: "⚠️ Token expired. Please login again." });
      }
      return res
        .status(401)
        .json({ message: "⚠️ Invalid token. Authentication failed." });
    }

    //  Fetch user INCLUDING sessions
    const user = await User.findById(decoded.id);
    if (!user) {
      return res
        .status(404)
        .json({ message: "⚠️ User not found. Authentication failed." });
    }

    //  Validate session
    const session = user.sessions?.find(
      (s) => s.sessionId === decoded.sessionId
    );

    if (!session) {
      return res.status(401).json({
        message: "⚠️ Session expired or revoked. Please login again.",
      });
    }

    //  Update last active
    session.lastActive = new Date();
    session.isCurrent = true;
    await user.save();

    // Attach user WITHOUT password
    req.user = user.toObject();
    delete req.user.password;

    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    return res.status(500).json({ message: "⚠️ Server error" });
  }
};

// ---------------- ADMIN GUARD ----------------
export const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ message: "⚠️ Admin access required" });
  }
  next();
};
