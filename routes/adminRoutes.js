import express from "express";
import os from "os";
import mongoose from "mongoose";

const router = express.Router();

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
