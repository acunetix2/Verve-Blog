import express from "express";
import Post from "../models/Post.js";
import { authMiddleware as auth } from "../middleware/auth.js";

const router = express.Router();

// Schedule a post (authenticated)
router.post("/schedule", auth, async (req, res) => {
  try {
    const { postId, scheduledAt } = req.body;
    
    const scheduledDate = new Date(scheduledAt);
    if (scheduledDate <= new Date()) {
      return res.status(400).json({ message: "Scheduled date must be in the future" });
    }
    
    const post = await Post.findByIdAndUpdate(
      postId,
      { 
        status: "scheduled", 
        scheduledAt: scheduledDate
      },
      { new: true }
    );
    
    if (!post) return res.status(404).json({ message: "Post not found" });
    
    res.json({
      message: "Post scheduled successfully",
      post,
      willPublishAt: scheduledDate
    });
  } catch (error) {
    res.status(500).json({ message: "Error scheduling post", error });
  }
});

// Get scheduled posts
router.get("/admin/scheduled", auth, async (req, res) => {
  try {
    const posts = await Post.find({ 
      status: "scheduled",
      author: req.user.name 
    })
      .sort({ scheduledAt: 1 });
    
    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: "Error fetching scheduled posts", error });
  }
});

// Cancel scheduled post
router.post("/cancel-schedule/:postId", auth, async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.postId,
      { 
        status: "draft", 
        scheduledAt: null
      },
      { new: true }
    );
    
    if (!post) return res.status(404).json({ message: "Post not found" });
    
    res.json({ message: "Schedule cancelled", post });
  } catch (error) {
    res.status(500).json({ message: "Error cancelling schedule", error });
  }
});

// Publish scheduled posts (run this as a cron job)
router.post("/publish-scheduled", async (req, res) => {
  try {
    const now = new Date();
    
    const posts = await Post.updateMany(
      { 
        status: "scheduled", 
        scheduledAt: { $lte: now }
      },
      { 
        status: "published",
        publishedAt: now
      }
    );
    
    res.json({ 
      message: "Scheduled posts published",
      updatedCount: posts.modifiedCount 
    });
  } catch (error) {
    res.status(500).json({ message: "Error publishing scheduled posts", error });
  }
});

export default router;
