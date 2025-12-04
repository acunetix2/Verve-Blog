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

dotenv.config();
const app = express();
const server = http.createServer(app);

// Middleware
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
// Initialize Passport
app.use(passport.initialize());
app.use(passport.session());

// Allow all development origins
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
//  MongoDB connection
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

//  API routes
app.use("/api/posts", postRoutes);
app.use("/api/auth", authRoutes); 
app.use("/api/auth", passwordResetRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/documents", documentsRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/ai", aiRoutes);

//  Health check route
app.get("/", (req, res) => {
  res.send("🟢 Verve Blog API running fine!");
});

// Global error handler
app.use((err, req, res, next) => {
  console.error("Server Error:", err);
  res.status(500).json({ message: "Internal Server Error" });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server + Socket.IO running on port ${PORT}`));

