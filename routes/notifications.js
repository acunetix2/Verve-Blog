/**
 * Author / Copyright: Iddy
 * All rights reserved.
 */
import express from "express";
import Notification from "../models/Notification.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

/* -----------------------------------------------------
   GET notifications (global or user-specific)
----------------------------------------------------- */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const { userId, unreadOnly, type, priority } = req.query;
    const filter = { isActive: true };

    // Get user-specific or global notifications
    if (userId) {
      filter.$or = [
        { userId: userId },
        { userId: null } // Global notifications
      ];
    }

    // Filter by type if provided
    if (type) {
      filter.type = type;
    }

    // Filter by priority if provided
    if (priority) {
      filter.priority = priority;
    }

    // Only unread if requested
    if (unreadOnly === "true") {
      filter.isRead = false;
    }

    const list = await Notification.find(filter)
      .populate("userId", "name email profileImage")
      .sort({ createdAt: -1 })
      .limit(50);

    return res.status(200).json(list);
  } catch (error) {
    console.error("GET /notifications error:", error);
    return res.status(500).json({ error: "Failed to load notifications" });
  }
});

/* -----------------------------------------------------
   POST - Create a new notification (enhanced)
----------------------------------------------------- */
router.post("/", authMiddleware, async (req, res) => {
  try {
    const { type, title, message, userId, priority, actionUrl, icon, backgroundColor, metadata } = req.body;

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
      userId: userId || null,
      priority: priority || "medium",
      actionUrl: actionUrl || null,
      icon: icon || "bell",
      backgroundColor: backgroundColor || "bg-blue-500",
      metadata: metadata || {},
      isRead: false,
      isActive: true,
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
      { isRead: true },
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
   PUT - Mark a notification as inactive/dismissed
----------------------------------------------------- */
router.put("/:id/dismiss", authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;

    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ error: "Invalid notification ID format" });
    }

    const updated = await Notification.findByIdAndUpdate(
      id,
      { isActive: false, isRead: true },
      { new: true }
    );

    if (!updated) {
      return res.status(404).json({ error: "Notification not found" });
    }

    return res.status(200).json(updated);
  } catch (error) {
    console.error("PUT /notifications/:id/dismiss error:", error);
    return res.status(500).json({ error: "Failed to dismiss notification" });
  }
});

/* -----------------------------------------------------
   PUT - Mark all notifications as read
----------------------------------------------------- */
router.put("/mark-all-read", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.body;
    const filter = { isRead: false };

    if (userId) {
      filter.$or = [
        { userId: userId },
        { userId: null }
      ];
    }

    const result = await Notification.updateMany(
      filter,
      { isRead: true }
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
   DELETE all inactive notifications
----------------------------------------------------- */
router.delete("/cleanup/inactive", authMiddleware, async (req, res) => {
  try {
    const result = await Notification.deleteMany({ isActive: false });

    return res.status(200).json({
      success: true,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("DELETE /notifications/cleanup/inactive error:", error);
    return res.status(500).json({ error: "Failed to cleanup inactive notifications" });
  }
});

export default router;
