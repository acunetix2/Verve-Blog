import express from "express";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import User from "../models/User.js";
import passport from "passport";
import cookieParser from "cookie-parser";

dotenv.config();
const router = express.Router();

// Enable cookie parsing
router.use(cookieParser());

// Initialize passport (VERY IMPORTANT)
router.use(passport.initialize());

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
      user: { id: user._id, email: user.email, role: user.role },
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
   GOOGLE OAUTH ROUTES
--------------------------------------------------- */
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { session: false, failureRedirect: "/" }),
  (req, res) => {
    try {
      const token = jwt.sign(
        { id: req.user._id, email: req.user.email, role: req.user.role },
        process.env.JWT_SECRET,
        { expiresIn: "2h" }
      );

      // ?? Send to frontend with token + role
      res.redirect(
        `${process.env.FRONTEND_URL}/login?token=${token}&role=${req.user.role}`
      );
    } catch (err) {
      console.error("Error generating token:", err);
      res.redirect("/");
    }
  }
);

/* ---------------------------------------------------
   OPTIONAL COOKIE CHECK
--------------------------------------------------- */
router.get("/me", (req, res) => {
  const token = req.cookies.google_token;
  if (!token) return res.json({ authenticated: false });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    res.json({ authenticated: true, user: decoded });
  } catch (err) {
    res.json({ authenticated: false });
  }
});

export default router;
