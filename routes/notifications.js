import express from "express";
import Notification from "../models/Notification.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

/* -----------------------------------------------------
   GET all global notifications
----------------------------------------------------- */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const list = await Notification.find().sort({ createdAt: -1 }); // newest first
    res.json(list);
  } catch (err) {
    console.error("GET /notifications error:", err);
    res.status(500).json({ error: "Failed to load notifications" });
  }
});

/* -----------------------------------------------------
   POST - Create a new global notification
----------------------------------------------------- */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { type, title, message } = req.body;

    if (!type || !title || !message) {
      return res.status(400).json({ error: "Missing fields" });
    }

    const notif = await Notification.create({
      type,
      title,
      message,
    });

    res.json(notif);
  } catch (err) {
    console.error("POST /notifications error:", err);
    res.status(500).json({ error: "Failed to create notification" });
  }
});

/* -----------------------------------------------------
   DELETE a notification by ID
----------------------------------------------------- */
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const deleted = await Notification.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({ error: "Notification not found" });
    }

    res.json({ success: true });
  } catch (err) {
    console.error("DELETE /notifications/:id error:", err);
    res.status(500).json({ error: "Failed to delete notification" });
  }
});

export default router;
