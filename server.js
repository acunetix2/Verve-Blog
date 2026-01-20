import adminRoutes from "./routes/adminRoutes.js";
import coursesRoutes from "./routes/coursesRoutes.js";
import twoFactorRoutes from "./routes/twoFactorRoutes.js";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import http from "http";
import dotenv from "dotenv";
import passport from "passport";
import { Server } from "socket.io";
import session from "express-session";
import "./config/passport.js"; 
import postRoutes from "./routes/postRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import documentsRoutes from "./routes/documentsRoutes.js";
import usersRoutes from "./routes/usersRoutes.js";
import notificationRoutes from "./routes/notifications.js";
import paymentRoutes from "./routes/paymentRoutes.js";
import passwordResetRoutes from "./routes/authPasswordReset.js";
import aiRoutes from "./ai/aiRoutes.js";
import simulationRoutes from "./routes/simulations.js";
import featuresRoutes from "./routes/featuresRoutes.js";
import userProfileRoutes from "./routes/userProfileRoutes.js";
import seriesRoutes from "./routes/seriesRoutes.js";
import schedulingRoutes from "./routes/schedulingRoutes.js";
import emailDigestRoutes from "./routes/emailDigestRoutes.js";
import bookmarkRoutes from "./routes/bookmarkRoutes.js";
import globalSearchRoutes from "./routes/globalSearchRoutes.js";
import subscriptionRoutes from "./routes/subscriptionRoutes.js";

dotenv.config();
const app = express();

// ============================================================
// MIDDLEWARE (MUST be before routes)
// ============================================================

// Body parser
app.use(express.json());

// Session setup (needed for Passport)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "verveblogsecret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
    },
  })
);
app.set("trust proxy", 1);

// CORS - MUST be before routes
app.use(
  cors({
    origin: [
      "http://localhost:8080",
      "http://127.0.0.1:8080",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "https://vervehub.onrender.com",
      "https://vervehub.netlify.app",
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: [
      "http://localhost:8080",
      "http://127.0.0.1:8080",
      "http://localhost:5173",
      "http://127.0.0.1:5173",
      "https://vervehub.onrender.com",
      "https://vervehub.netlify.app",
    ], 
    methods: ["GET", "POST"],
  },
});

// Make io accessible in routes
app.set("io", io);

// ============================================================
// MONGODB CONNECTION
// ============================================================
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB connected successfully"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

// ============================================================
// API ROUTES (AFTER middleware)
// ============================================================
app.use("/api/admin", adminRoutes);
app.use("/api/courses", coursesRoutes);
app.use("/api/2fa", twoFactorRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/auth", authRoutes); 
app.use("/api/auth", passwordResetRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/documents", documentsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/simulations", simulationRoutes);
app.use("/api/features", featuresRoutes);
app.use("/api/analytics", featuresRoutes);
app.use("/api/bookmarks", bookmarkRoutes);
app.use("/api/recommendations", featuresRoutes);
app.use("/api/engagement", featuresRoutes);
app.use("/api/users/profile", userProfileRoutes);
app.use("/api/users", userProfileRoutes);
app.use("/api/series", seriesRoutes);
app.use("/api/posts/schedule", schedulingRoutes);
app.use("/api/digest", emailDigestRoutes);
app.use("/api/search", globalSearchRoutes);

// ============================================================
// ERROR HANDLER (AFTER all routes)
// ============================================================
app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  res.status(500).json({ message: "Internal Server Error" });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server + Socket.IO running on port ${PORT}`));

