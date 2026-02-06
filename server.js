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
import logger from "./config/logger.js";
import { createMorganMiddleware } from "./utils/morganLogger.js";
import requestIdMiddleware from "./middleware/requestIdMiddleware.js"; 
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
import commentRoutes from "./routes/commentRoutes.js";
import reviewsAndBadgesRoutes from "./routes/reviewsAndBadgesRoutes.js";
import wishlistRoutes from "./routes/wishlistRoutes.js";
import emailNotificationRoutes from "./routes/emailNotificationRoutes.js";

dotenv.config();
const app = express();

// ============================================================
// MIDDLEWARE (MUST be before routes)
// ============================================================

// Trust proxy (MUST be before session on Render / proxies)
app.set("trust proxy", 1);

// Request ID middleware (FIRST)
app.use(requestIdMiddleware);

// HTTP request logging
app.use(createMorganMiddleware());

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

// CORS
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
  .then(() => {
    logger.info("MongoDB connected successfully");
  })
  .catch((err) => {
    logger.error("MongoDB connection error", {
      error: err.message,
      stack: err.stack,
    });
    process.exit(1);
  });

// ============================================================
// HEALTH CHECK
// ============================================================
app.get("/api/health", (req, res) => {
  const dbState = mongoose.connection.readyState;

  res.status(200).json({
    status: "OK",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    checks: {
      api: "ok",
      database:
        dbState === 1
          ? "connected"
          : dbState === 2
          ? "connecting"
          : "disconnected",
    },
  });
});

// ============================================================
// API ROUTE HANDLERS
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
app.use("/api/comments", commentRoutes);
app.use("/api/reviews", reviewsAndBadgesRoutes);
app.use("/api/badges", reviewsAndBadgesRoutes);
app.use("/api/recommendations", reviewsAndBadgesRoutes);
app.use("/api/wishlist", wishlistRoutes);
app.use("/api/analytics", wishlistRoutes);
app.use("/api/profile", wishlistRoutes);
app.use("/api/email-notifications", emailNotificationRoutes);

// ============================================================
// ERROR HANDLER (LAST)
// ============================================================
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || 500;
  const errorId = req.id || "unknown";

  logger.error("Unhandled error", {
    requestId: errorId,
    statusCode,
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    userId: req.user?.id || "anonymous",
    ip: req.ip,
  });

  res.status(statusCode).json({
    message: "Internal Server Error",
    errorId,
    ...(process.env.NODE_ENV === "development" && { error: err.message }),
  });
});

// ============================================================
// START SERVER
// ============================================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`Server + Socket.IO started`, {
    port: PORT,
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
  });
});
