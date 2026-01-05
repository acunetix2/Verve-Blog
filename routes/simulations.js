
/**
 * Author / Copyright: Iddy
 * All rights reserved.
 */
 // backend/routes/simulations.js
import express from "express";
import AttackSimulation from "../models/AttackSimulation.js";
import cloudinary from "../config/cloudinary.js";
import multer from "multer";
import fs from "fs";
import mongoose from "mongoose";
import fetch from "node-fetch"; // make sure to install node-fetch v3 for ESM

const router = express.Router();
const upload = multer({ dest: "tmp/" });

// ===============================
// UPLOAD Simulation
// ===============================
router.post("/", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(req.file.path, {
      resource_type: "auto", // auto detects HTML, images, videos, etc.
      folder: "vervehub_simulations",
      use_filename: true,
      unique_filename: true
    });

    // Delete local file
    fs.unlinkSync(req.file.path);

    // Save simulation metadata in MongoDB
    const sim = await AttackSimulation.create({
      title: req.body.title,
      description: req.body.description,
      fileUrl: result.secure_url
    });

    res.status(201).json(sim);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to upload simulation" });
  }
});

// ===============================
// GET All Simulations
// ===============================
router.get("/", async (_req, res) => {
  try {
    const sims = await AttackSimulation.find().sort({ createdAt: -1 });
    res.json(sims);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch simulations" });
  }
});

// ===============================
// GET Simulation By ID (Metadata)
// ===============================
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    if (!id || id === "undefined" || id === "null") {
      return res.status(400).json({ error: "Simulation ID is required" });
    }

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid simulation ID format" });
    }

    const sim = await AttackSimulation.findById(id);
    if (!sim) return res.status(404).json({ message: "Simulation not found" });

    res.json(sim);
  } catch (err) {
    console.error("Error fetching simulation:", err);
    res.status(500).json({ error: "Failed to fetch simulation" });
  }
});

// ===============================
// GET Simulation File for Iframe Rendering
// ===============================
router.get("/:id/file", async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid simulation ID" });
    }

    const sim = await AttackSimulation.findById(id);
    if (!sim) return res.status(404).json({ error: "Simulation not found" });

    // Fetch HTML file from Cloudinary
    const response = await fetch(sim.fileUrl);
    if (!response.ok) {
      return res.status(500).json({ error: "Failed to fetch simulation file" });
    }

    const htmlContent = await response.text();

    // Force browser to render as HTML
    res.setHeader("Content-Type", "text/html");
    res.send(htmlContent);
  } catch (err) {
    console.error("Error serving simulation file:", err);
    res.status(500).json({ error: "Failed to serve simulation file" });
  }
});

export default router;
