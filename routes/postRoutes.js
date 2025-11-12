import express from "express";
import Post from "../models/Post.js";
import { authMiddleware } from "../middleware/auth.js"; // middleware that sets req.user

const router = express.Router();

// 🟢 Get all posts
router.get("/", async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🟢 Create new post
router.post("/create", async (req, res) => {
  try {
    const { title, content, author, slug, tags } = req.body;

    const existingPost = await Post.findOne({ slug });
    if (existingPost) {
      return res.status(400).json({ message: "Slug already exists" });
    }

    const newPost = new Post({
      title,
      content,
      author,
      slug,
      tags,
      likes: 0,
      views: 0,
      comments: [],
      likedBy: [],
      viewedBy: [],
    });
    await newPost.save();
    res.status(201).json(newPost);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🟢 Get post by slug
router.get("/:slug", async (req, res) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug });
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔵 Get likes count for a post
router.get("/:slug/likes", async (req, res) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug });
    if (!post) return res.status(404).json({ message: "Post not found" });

    let userHasLiked = false;
    if (req.user) userHasLiked = post.likedBy.includes(req.user.id);

    res.json({ likes: post.likes || 0, userHasLiked });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔵 Like a post (restricted)
router.post("/:slug/like", authMiddleware, async (req, res) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug });
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
    res.status(500).json({ error: err.message });
  }
});

// 🔵 Unlike a post (restricted)
router.post("/:slug/unlike", authMiddleware, async (req, res) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug });
    if (!post) return res.status(404).json({ message: "Post not found" });

    const userId = req.user.id;
    if (!post.likedBy.includes(userId)) {
      return res.status(400).json({ message: "You have not liked this post yet", likes: post.likes });
    }

    post.likedBy = post.likedBy.filter(id => id.toString() !== userId);
    post.likes = post.likedBy.length;
    await post.save();

    res.json({ likes: post.likes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🟢 Get views count
router.get("/:slug/views", async (req, res) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug });
    if (!post) return res.status(404).json({ message: "Post not found" });

    let userHasViewed = false;
    if (req.user) userHasViewed = post.viewedBy.includes(req.user.id);

    res.json({ views: post.views || 0, userHasViewed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔵 Increment views (restricted)
router.post("/:slug/view", authMiddleware, async (req, res) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug });
    if (!post) return res.status(404).json({ message: "Post not found" });

    const userId = req.user.id;

    // Increment only once per user
    if (!post.viewedBy.includes(userId)) {
      post.viewedBy.push(userId);
      post.views = post.viewedBy.length;
      await post.save();
    }

    res.json({ views: post.views });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔵 Get comments
router.get("/:slug/comments", async (req, res) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug });
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json(post.comments || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔵 Add comment (name + text)
router.post("/:slug/comments-name", async (req, res) => {
  try {
    const { name, text } = req.body;
    if (!name || !text) return res.status(400).json({ message: "Name and text are required" });

    const post = await Post.findOne({ slug: req.params.slug });
    if (!post) return res.status(404).json({ message: "Post not found" });

    const comment = { author: name, text, date: new Date() };
    post.comments.push(comment);
    await post.save();

    res.status(201).json(comment);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🟢 Delete post
router.delete("/:id", async (req, res) => {
  try {
    const deletedPost = await Post.findByIdAndDelete(req.params.id);
    if (!deletedPost) return res.status(404).json({ message: "Post not found" });
    res.json({ message: "Post deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🟢 Update post
router.put("/:id", async (req, res) => {
  try {
    const updatedPost = await Post.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updatedPost) return res.status(404).json({ message: "Post not found" });
    res.json({ message: "Post updated successfully", updatedPost });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

export default router;
