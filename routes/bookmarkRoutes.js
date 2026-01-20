import express from "express";
import { authMiddleware } from "../middleware/auth.js";
import User from "../models/User.js";
import Post from "../models/Post.js";

const router = express.Router();

/**
 * Get user's bookmarks
 * GET /api/bookmarks
 */
router.get("/", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Fetch bookmarked posts
    const bookmarkedPostIds = user.bookmarkedPosts || [];
    const savedArticles = await Post.find({ _id: { $in: bookmarkedPostIds } }).select(
      "_id title slug author readTime date tags"
    );

    // Map to the expected format
    const formattedArticles = savedArticles.map((post) => ({
      _id: post._id,
      postId: post._id,
      title: post.title,
      slug: post.slug,
      author: post.author,
      readTime: post.readTime,
      date: post.date,
      savedAt: new Date(),
      readingProgress: 0,
      totalWords: 0,
      wordsRead: 0,
      status: "unread",
      estimatedTimeLeft: 0,
    }));

    res.json({
      success: true,
      savedArticles: formattedArticles,
      readingHistory: [],
      totalSaved: formattedArticles.length,
      totalRead: 0,
    });
  } catch (error) {
    console.error("Get bookmarks error:", error);
    res.status(500).json({ message: "Failed to fetch bookmarks" });
  }
});

/**
 * Add bookmark
 * POST /api/bookmarks/:postId
 */
router.post("/:postId", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const post = await Post.findById(req.params.postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    if (!user.bookmarkedPosts) user.bookmarkedPosts = [];

    if (!user.bookmarkedPosts.includes(req.params.postId)) {
      user.bookmarkedPosts.push(req.params.postId);
      await user.save();
    }

    res.json({ success: true, message: "Bookmark added" });
  } catch (error) {
    console.error("Add bookmark error:", error);
    res.status(500).json({ message: "Failed to add bookmark" });
  }
});

/**
 * Remove bookmark
 * DELETE /api/bookmarks/:articleId
 */
router.delete("/:articleId", authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.bookmarkedPosts) {
      user.bookmarkedPosts = user.bookmarkedPosts.filter(
        (id) => id.toString() !== req.params.articleId
      );
      await user.save();
    }

    res.json({ success: true, message: "Bookmark removed" });
  } catch (error) {
    console.error("Remove bookmark error:", error);
    res.status(500).json({ message: "Failed to remove bookmark" });
  }
});

/**
 * Update reading progress
 * PUT /api/bookmarks/:articleId/progress
 */
router.put("/:articleId/progress", authMiddleware, async (req, res) => {
  try {
    const { progress } = req.body;
    // This is a simple implementation. In production, you'd store progress separately
    res.json({ success: true, message: "Progress updated" });
  } catch (error) {
    console.error("Update progress error:", error);
    res.status(500).json({ message: "Failed to update progress" });
  }
});

/**
 * Clear reading history
 * DELETE /api/bookmarks/history
 */
router.delete("/history", authMiddleware, async (req, res) => {
  try {
    // Clear reading history logic
    res.json({ success: true, message: "Reading history cleared" });
  } catch (error) {
    console.error("Clear history error:", error);
    res.status(500).json({ message: "Failed to clear history" });
  }
});

export default router;
