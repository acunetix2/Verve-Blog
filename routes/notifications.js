import express from "express";
import Notification from "../models/Notification.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// -----------------------------------------------------
// GET all notifications (global)
// -----------------------------------------------------
router.get("/", authMiddleware, async (req, res) => {
  try {
    const list = await Notification.find()
      .sort({ time: -1 }); // latest first
    res.json(list);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load notifications" });
  }
});

// -----------------------------------------------------
// POST - Save a new notification (called by server events)
// -----------------------------------------------------
router.post("/", authMiddleware, async (req, res) => {
  try {
    const notif = await Notification.create({
      type: req.body.type,
      title: req.body.title,
      message: req.body.message,
      time: new Date(),
    });

    res.json(notif);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to create notification" });
  }
});

// -----------------------------------------------------
// DELETE - Optional: clear a notification by ID
// -----------------------------------------------------
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to delete notification" });
  }
});

export default router;
