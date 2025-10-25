import express from "express";
import Post from "../models/Post.js";

const router = express.Router();

// Get all posts
router.get("/", async (req, res) => {
  try {
    const posts = await Post.find().sort({ createdAt: -1 });
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create new post
router.post("/", async (req, res) => {
  try {
    const { title, content, author, slug } = req.body;

    // Ensure slug is unique
    const existingPost = await Post.findOne({ slug });
    if (existingPost) {
      return res.status(400).json({ message: "Slug already exists" });
    }

    const newPost = new Post({ title, content, author, slug });
    await newPost.save();
    res.status(201).json(newPost);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single post by slug
router.get("/:slug", async (req, res) => {
  try {
    const post = await Post.findOne({ slug: req.params.slug });
    if (!post) return res.status(404).json({ message: "Post not found" });
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
