import express from "express";
import Series from "../models/Series.js";
import Post from "../models/Post.js";
import { authMiddleware as auth } from "../middleware/auth.js";

const router = express.Router();

// Get all series
router.get("/", async (req, res) => {
  try {
    const { author, category } = req.query;
    let query = { isPublished: true };
    
    if (author) query.author = author;
    if (category) query.category = category;
    
    const series = await Series.find(query)
      .populate("author", "name email")
      .populate("posts")
      .sort({ createdAt: -1 });
    
    res.json(series);
  } catch (error) {
    res.status(500).json({ message: "Error fetching series", error });
  }
});

// Get single series by slug
router.get("/:slug", async (req, res) => {
  try {
    const series = await Series.findOne({ slug: req.params.slug })
      .populate("author", "name email")
      .populate({
        path: "posts",
        select: "title slug description content publishedAt views",
        options: { sort: { seriesOrder: 1 } }
      });
    
    if (!series) return res.status(404).json({ message: "Series not found" });
    
    // Increment views
    series.views += 1;
    await series.save();
    
    res.json(series);
  } catch (error) {
    res.status(500).json({ message: "Error fetching series", error });
  }
});

// Create series (authenticated)
router.post("/", auth, async (req, res) => {
  try {
    const { title, description, category, image } = req.body;
    
    const series = new Series({
      title,
      description,
      category,
      image,
      author: req.user.id,
      posts: [],
    });
    
    await series.save();
    res.status(201).json(series);
  } catch (error) {
    res.status(500).json({ message: "Error creating series", error });
  }
});

// Update series (authenticated)
router.put("/:id", auth, async (req, res) => {
  try {
    const series = await Series.findById(req.params.id);
    
    if (!series) return res.status(404).json({ message: "Series not found" });
    if (series.author.toString() !== req.user.id)
      return res.status(403).json({ message: "Not authorized" });
    
    Object.assign(series, req.body);
    await series.save();
    res.json(series);
  } catch (error) {
    res.status(500).json({ message: "Error updating series", error });
  }
});

// Delete series (authenticated)
router.delete("/:id", auth, async (req, res) => {
  try {
    const series = await Series.findById(req.params.id);
    
    if (!series) return res.status(404).json({ message: "Series not found" });
    if (series.author.toString() !== req.user.id)
      return res.status(403).json({ message: "Not authorized" });
    
    await Series.findByIdAndDelete(req.params.id);
    res.json({ message: "Series deleted" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting series", error });
  }
});

// Add post to series
router.post("/:id/posts/:postId", auth, async (req, res) => {
  try {
    const series = await Series.findById(req.params.id);
    
    if (!series) return res.status(404).json({ message: "Series not found" });
    if (series.author.toString() !== req.user.id)
      return res.status(403).json({ message: "Not authorized" });
    
    if (!series.posts.includes(req.params.postId)) {
      series.posts.push(req.params.postId);
      await series.save();
    }
    
    // Update post with series info
    await Post.findByIdAndUpdate(req.params.postId, {
      series: req.params.id,
      seriesOrder: series.posts.length - 1
    });
    
    res.json(series);
  } catch (error) {
    res.status(500).json({ message: "Error adding post to series", error });
  }
});

// Remove post from series
router.delete("/:id/posts/:postId", auth, async (req, res) => {
  try {
    const series = await Series.findById(req.params.id);
    
    if (!series) return res.status(404).json({ message: "Series not found" });
    if (series.author.toString() !== req.user.id)
      return res.status(403).json({ message: "Not authorized" });
    
    series.posts = series.posts.filter(
      (post) => post.toString() !== req.params.postId
    );
    await series.save();
    
    // Remove series from post
    await Post.findByIdAndUpdate(req.params.postId, {
      series: null,
      seriesOrder: 0
    });
    
    res.json(series);
  } catch (error) {
    res.status(500).json({ message: "Error removing post from series", error });
  }
});

export default router;
