/**
 * Author / Copyright: Iddy
 * All rights reserved.
 */
import express from "express";
import Notification from "../models/Notification.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

/* -----------------------------------------------------
   GET all global notifications
----------------------------------------------------- */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const list = await Notification.find().sort({ createdAt: -1 });
    return res.status(200).json(list);
  } catch (error) {
    console.error("GET /notifications error:", error);
    return res.status(500).json({ error: "Failed to load notifications" });
  }
});

/* -----------------------------------------------------
   POST - Create a new global notification
----------------------------------------------------- */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { type, title, message } = req.body;

    // Validate input
    if (!type || !title || !message) {
      return res.status(400).json({
        error: "Missing fields: type, title, and message are required",
      });
    }

    const newNotif = new Notification({
      type,
      title,
      message,
    });

    const saved = await newNotif.save();
    return res.status(201).json(saved);
  } catch (error) {
    console.error("POST /notifications error:", error);
    return res.status(500).json({ error: "Failed to create notification" });
  }
});

/* -----------------------------------------------------
   PUT - Mark a notification as read by ID
----------------------------------------------------- */
router.put("/:id/read", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: "Invalid notification ID format" });
    }

    const updated = await Notification.findByIdAndUpdate(
      id,
      { read: true },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Notification not found" });
    }

    return res.status(200).json(updated);
  } catch (error) {
    console.error("PUT /notifications/:id/read error:", error);
    return res.status(500).json({ error: "Failed to mark notification as read" });
  }
});

/* -----------------------------------------------------
   PUT - Mark all notifications as read
----------------------------------------------------- */
router.put("/mark-all-read", authMiddleware, async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { read: false },
      { read: true }
    );

    return res.status(200).json({
      success: true,
      modifiedCount: result.modifiedCount,
    });
  } catch (error) {
    console.error("PUT /notifications/mark-all-read error:", error);
    return res.status(500).json({ error: "Failed to mark all notifications as read" });
  }
});

/* -----------------------------------------------------
   DELETE a notification by ID
----------------------------------------------------- */
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: "Invalid notification ID format" });
    }

    const deleted = await Notification.findByIdAndDelete(id);

    if (!deleted) {
      return res.status(404).json({ error: "Notification not found" });
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error("DELETE /notifications/:id error:", error);
    return res.status(500).json({ error: "Failed to delete notification" });
  }
});

/* -----------------------------------------------------
   DELETE all notifications
----------------------------------------------------- */
router.delete("/", authMiddleware, async (req, res) => {
  try {
    const result = await Notification.deleteMany({});

    return res.status(200).json({
      success: true,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("DELETE /notifications error:", error);
    return res.status(500).json({ error: "Failed to delete all notifications" });
  }
});

export default router;
