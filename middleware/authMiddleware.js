import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    if (!token)
      return res.status(401).json({ message: "⚠️ No token provided" });

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === "TokenExpiredError") {
        return res
          .status(401)
          .json({ message: "⚠️ Token expired. Please login again." });
      } else {
        return res
          .status(401)
          .json({ message: "⚠️ Invalid token. Authentication failed." });
      }
    }

    req.user = await User.findById(decoded.id).select("-password");
    if (!req.user)
      return res
        .status(404)
        .json({ message: "⚠️ User not found. Authentication failed." });

    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    return res.status(500).json({ message: "⚠️ Server error" });
  }
};

export const adminOnly = (req, res, next) => {
  if (req.user?.role !== "admin")
    return res.status(403).json({ message: "⚠️ Admin access required" });
  next();
};
