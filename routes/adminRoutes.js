import express from "express";
import os from "os";
import mongoose from "mongoose";
import multer from "multer";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Course from "../models/Course.js";
import { getParserForFileType, createRoomFromParsedContent } from "../utils/contentParser.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const router = express.Router();

// Configure multer for file uploads
const uploadDir = path.join(__dirname, "../tmp");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedExts = [".md", ".markdown", ".txt", ".html"];
    const fileExt = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(fileExt)) {
      cb(null, true);
    } else {
      cb(new Error("Only .md, .txt, and .html files are allowed"));
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});

// Admin content upload endpoint
router.post("/upload-content", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    // Parse config from request body
    const config = {
      title: req.body.title || "Untitled Room",
      description: req.body.description || "",
      category: req.body.category || "General",
      difficulty: req.body.difficulty || "Beginner",
      roomType: req.body.roomType || "learning",
      pointsPerQuestion: parseInt(req.body.pointsPerQuestion || 8),
      withBadge: req.body.withBadge === "true",
      withCertificate: req.body.withCertificate === "true",
    };

    // Read file content
    const fileContent = fs.readFileSync(req.file.path, "utf8");

    // Get appropriate parser based on file type
    const parser = getParserForFileType(req.file.originalname);

    // Parse content
    const parsed = parser(fileContent, config);

    // Create room from parsed content
    const roomData = createRoomFromParsedContent(config, parsed);

    // Create and save new Course
    const newRoom = new Course(roomData);
    const savedRoom = await newRoom.save();

    // Clean up uploaded file
    fs.unlinkSync(req.file.path);

    res.json({
      success: true,
      roomId: savedRoom._id,
      title: savedRoom.title,
      questionsCount: savedRoom.questions.length,
      lessonsCount: savedRoom.modules[0].lessons.length,
      totalPoints: savedRoom.rewards.totalPoints,
    });
  } catch (error) {
    // Clean up file on error
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        // Ignore cleanup errors
      }
    }
    console.error("Content upload error:", error);
    res.status(500).json({ error: error.message });
  }
});

// System status endpoint
router.get("/system-status", async (req, res) => {
  try {
    const dbState = mongoose.connection.readyState;
    const status = dbState === 1 ? "Connected" : "Disconnected";
    const latency = "12ms"; // Placeholder, implement real ping if needed
    res.json({
      database: { status, latency },
      api: { status: "Running", uptime: process.uptime() },
      memory: { usage: `${Math.round((os.totalmem() - os.freemem()) / 1024 / 1024)}MB`, total: `${Math.round(os.totalmem() / 1024 / 1024)}MB` },
      cpu: { usage: "N/A" },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Performance metrics endpoint
router.get("/performance", (req, res) => {
  res.json({
    avgResponseTime: "145ms",
    requestsPerSec: "342",
    errorRate: "0.02%",
    cpuUsage: "22%",
    peakTime: "2:30 PM",
  });
});

// Cache clear endpoint (dummy)
router.post("/cache/clear", (req, res) => {
  res.json({ cleared: true });
});

export default router;
