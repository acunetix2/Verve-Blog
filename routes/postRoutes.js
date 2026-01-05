/**
 * Author / Copyright: Iddy
 * All rights reserved.
 */
import express from "express";
import Post from "../models/Post.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

// ============================
// GET ALL POSTS WITH PAGINATION & FILTERING
// ============================
router.get("/", async (req, res) => {
  try {
    const { page = 1, limit = 20, category, author, tags } = req.query;

    const filter = {};
    if (category) filter.category = category;
    if (author) filter.author = author;
    if (tags) filter.tags = { $in: tags.split(",") };

    const posts = await Post.find(filter)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip((parseInt(page) - 1) * parseInt(limit));

    res.json(posts);
  } catch (err) {
    console.error("GET POSTS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================
// CREATE NEW POST
// ============================
router.post("/create", authMiddleware, async (req, res) => {
  const io = req.app.get("io");
  try {
    const { title, content, slug, tags, category } = req.body;
    const author = req.user.id;

    if (!title || !content || !slug) {
      return res.status(400).json({ message: "Title, content, and slug are required" });
    }

    const normalizedSlug = slug.trim().toLowerCase();
    const existingPost = await Post.findOne({ slug: normalizedSlug });
    if (existingPost) return res.status(400).json({ message: "Slug already exists" });

    const newPost = new Post({
      title,
      content,
      author,
      slug: normalizedSlug,
      tags: tags || [],
      category: category || "Uncategorized",
      likes: 0,
      views: 0,
      comments: [],
      likedBy: [],
      viewedBy: [],
    });

    await newPost.save();

    // Emit event via WebSocket
    io.emit("new-post", newPost);

    // Global notification
    await Notification.create({
      type: "post",
      title: "New Blog Post",
      message: newPost.title,
    });

    res.status(201).json(newPost);
  } catch (err) {
    console.error("CREATE POST ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================
// COUNT POSTS THIS MONTH
// ============================
router.get("/count-this-month", async (req, res) => {
  try {
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(endOfMonth.getMonth() + 1);

    const count = await Post.countDocuments({
      createdAt: { $gte: startOfMonth, $lt: endOfMonth },
    });

    res.json({ count });
  } catch (err) {
    console.error("COUNT POSTS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================
// TOTAL COMMENTS & LIKES (ALL POSTS)
// ============================
router.get("/comments", async (req, res) => {
  try {
    const posts = await Post.find();
    const totalComments = posts.reduce((acc, post) => acc + post.comments.length, 0);
    res.json({ count: totalComments });
  } catch (err) {
    console.error("TOTAL COMMENTS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

router.get("/likes", async (req, res) => {
  try {
    const posts = await Post.find();
    const totalLikes = posts.reduce((acc, post) => acc + post.likes, 0);
    res.json({ count: totalLikes });
  } catch (err) {
    console.error("TOTAL LIKES ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================
// GET POST BY SLUG
// ============================
router.get("/:slug", async (req, res) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug.toLowerCase() });
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json(post);
  } catch (err) {
    console.error("GET POST ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================
// POST LIKES & UNLIKES
// ============================
router.get("/:slug/likes", async (req, res) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug.toLowerCase() });
    if (!post) return res.status(404).json({ message: "Post not found" });

    const userHasLiked = req.user ? post.likedBy.includes(req.user.id) : false;
    res.json({ likes: post.likes, userHasLiked });
  } catch (err) {
    console.error("GET LIKES ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/:slug/like", authMiddleware, async (req, res) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug.toLowerCase() });
    if (!post) return res.status(404).json({ message: "Post not found" });

    const userId = req.user.id;
    if (post.likedBy.includes(userId)) {
      return res.status(400).json({ message: "You already liked this post", likes: post.likes });
    }

    post.likedBy.push(userId);
    post.likes = post.likedBy.length;
    await post.save();

    res.json({ likes: post.likes });
  } catch (err) {
    console.error("LIKE POST ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/:slug/unlike", authMiddleware, async (req, res) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug.toLowerCase() });
    if (!post) return res.status(404).json({ message: "Post not found" });

    const userId = req.user.id;
    if (!post.likedBy.includes(userId)) {
      return res.status(400).json({ message: "You have not liked this post yet", likes: post.likes });
    }

    post.likedBy = post.likedBy.filter((id) => id.toString() !== userId);
    post.likes = post.likedBy.length;
    await post.save();

    res.json({ likes: post.likes });
  } catch (err) {
    console.error("UNLIKE POST ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================
// POST VIEWS
// ============================
router.get("/:slug/views", async (req, res) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug.toLowerCase() });
    if (!post) return res.status(404).json({ message: "Post not found" });

    const userHasViewed = req.user ? post.viewedBy.includes(req.user.id) : false;
    res.json({ views: post.views, userHasViewed });
  } catch (err) {
    console.error("GET VIEWS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/:slug/view", authMiddleware, async (req, res) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug.toLowerCase() });
    if (!post) return res.status(404).json({ message: "Post not found" });

    const userId = req.user.id;
    if (!post.viewedBy.includes(userId)) {
      post.viewedBy.push(userId);
      post.views = post.viewedBy.length;
      await post.save();
    }

    res.json({ views: post.views });
  } catch (err) {
    console.error("INCREMENT VIEW ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================
// COMMENTS
// ============================
router.get("/:slug/comments", async (req, res) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug.toLowerCase() });
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json(post.comments || []);
  } catch (err) {
    console.error("GET COMMENTS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

router.post("/:slug/comments-name", async (req, res) => {
  try {
    const { name, text } = req.body;
    if (!name || !text) return res.status(400).json({ message: "Name and text are required" });

    const post = await Post.findOne({ slug: req.params.slug.toLowerCase() });
    if (!post) return res.status(404).json({ message: "Post not found" });

    const comment = { author: name, text, date: new Date().toISOString() };
    post.comments.push(comment);
    await post.save();

    res.status(201).json(comment);
  } catch (err) {
    console.error("ADD COMMENT ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

// ============================
// DELETE & UPDATE POST
// ============================
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const deletedPost = await Post.findByIdAndDelete(req.params.id);
    if (!deletedPost) return res.status(404).json({ message: "Post not found" });
    res.json({ message: "Post deleted successfully" });
  } catch (err) {
    console.error("DELETE POST ERROR:", err);
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", authMiddleware, async (req, res) => {
  try {
    const allowedFields = ["title", "content", "tags", "category", "slug"];
    const updatedData = {};
    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) updatedData[field] = req.body[field];
    });

    if (!updatedData.category) updatedData.category = "Uncategorized";
    if (updatedData.slug) updatedData.slug = updatedData.slug.trim().toLowerCase();

    const updatedPost = await Post.findByIdAndUpdate(req.params.id, updatedData, { new: true });
    if (!updatedPost) return res.status(404).json({ message: "Post not found" });

    res.json({ message: "Post updated successfully", updatedPost });
  } catch (err) {
    console.error("UPDATE POST ERROR:", err);
    res.status(400).json({ error: err.message });
  }
});

export default router;
