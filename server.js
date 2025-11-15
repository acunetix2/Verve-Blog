import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";
import passport from "passport";
import session from "express-session";
import "./config/passport.js"; 
import postRoutes from "./routes/postRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import documentsRoutes from "./routes/documentsRoutes.js";
import usersRoutes from "./routes/usersRoutes.js";

dotenv.config();
const app = express();

// Middleware
app.use(express.json());

// Session setup (needed for Passport)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "verveblogsecret",
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }, // set secure:true only in production (https)
  })
);

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
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

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
app.use("/api/auth", authRoutes); // includes Google OAuth now
app.use("/api/users", usersRoutes);
app.use("/api/documents", documentsRoutes);

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
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
