import express from "express";
import Post from "../models/Post.js";
import Analytics from "../models/Analytics.js";
import Bookmark from "../models/Bookmark.js";
import Engagement from "../models/Engagement.js";
import ReadingHistory from "../models/ReadingHistory.js";
import User from "../models/User.js";

const router = express.Router();

// Middleware for authentication
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });
  
  try {
    const decoded = require("jsonwebtoken").verify(
      token,
      process.env.JWT_SECRET
    );
    req.userId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Get user analytics dashboard
router.get("/analytics", auth, async (req, res) => {
  try {
    const { range = "7d" } = req.query;

    // Calculate date range
    const now = new Date();
    let startDate = new Date();

    switch (range) {
      case "7d":
        startDate.setDate(now.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(now.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(now.getDate() - 90);
        break;
      case "1y":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      default:
        startDate = new Date(0);
    }

    // Get user's posts
    const userPosts = await Post.find({ author: req.userId });
    const postIds = userPosts.map((p) => p._id);

    // Get analytics for this period
    const analytics = await Analytics.find({
      postId: { $in: postIds },
      createdAt: { $gte: startDate, $lte: now },
    });

    // Calculate summary stats
    const summary = {
      views: analytics.reduce((sum, a) => sum + a.views, 0),
      likes: analytics.reduce((sum, a) => sum + a.likes, 0),
      comments: analytics.reduce((sum, a) => sum + a.comments, 0),
      shares: analytics.reduce((sum, a) => sum + a.shares, 0),
      readTime: Math.round(
        analytics.reduce((sum, a) => sum + a.averageReadTime, 0) /
          analytics.length
      ),
    };

    // Generate time series data
    const timeSeries = [];
    const daysCount = range === "7d" ? 7 : range === "30d" ? 30 : range === "90d" ? 90 : 365;

    for (let i = 0; i < daysCount; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split("T")[0];

      const dayAnalytics = analytics.filter(
        (a) => a.createdAt.toISOString().split("T")[0] === dateStr
      );

      timeSeries.unshift({
        date: dateStr,
        views: dayAnalytics.reduce((sum, a) => sum + a.views, 0),
        engagement: dayAnalytics.reduce((sum, a) => sum + a.likes + a.comments, 0),
        readTime: Math.round(
          dayAnalytics.reduce((sum, a) => sum + a.averageReadTime, 0) /
            (dayAnalytics.length || 1)
        ),
      });
    }

    // Top performing posts
    const topPosts = userPosts
      .map((post) => {
        const postAnalytics = analytics.filter((a) =>
          a.postId.equals(post._id)
        );
        const totalViews = postAnalytics.reduce((sum, a) => sum + a.views, 0);
        const totalEngagement = postAnalytics.reduce(
          (sum, a) => sum + a.likes + a.comments,
          0
        );

        return {
          title: post.title,
          views: totalViews,
          engagement: Math.round((totalEngagement / Math.max(totalViews, 1)) * 100),
          trend: totalViews > 10 ? "up" : "down",
        };
      })
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);

    res.json({
      summary,
      timeSeries,
      topPosts,
    });
  } catch (error) {
    console.error("Analytics error:", error);
    res.status(500).json({ message: "Failed to fetch analytics" });
  }
});

// Get trending posts
router.get("/trending", async (req, res) => {
  try {
    const { limit = 5, category } = req.query;
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    let query = { createdAt: { $gte: sevenDaysAgo } };
    if (category) query.category = category;

    const trendingPosts = await Post.find(query)
      .sort({ views: -1, likes: -1 })
      .limit(parseInt(limit))
      .lean();

    const postsWithTrend = trendingPosts.map((post, index) => ({
      ...post,
      trendScore: (parseInt(limit) - index) * 10 + post.views,
      trending: index < 3,
      momentum: post.views > 100 ? "rising" : post.views > 50 ? "stable" : "declining",
    }));

    res.json(postsWithTrend);
  } catch (error) {
    console.error("Trending posts error:", error);
    res.status(500).json({ message: "Failed to fetch trending posts" });
  }
});

// Advanced search
router.get("/search", async (req, res) => {
  try {
    const {
      q,
      sort = "relevance",
      category,
      dateRange,
      tags,
      page = 1,
      limit = 10,
    } = req.query;

    let query = {};

    // Text search
    if (q) {
      query.$or = [
        { title: { $regex: q, $options: "i" } },
        { content: { $regex: q, $options: "i" } },
        { description: { $regex: q, $options: "i" } },
      ];
    }

    // Category filter
    if (category) query.category = category;

    // Date range filter
    if (dateRange) {
      const now = new Date();
      let startDate = new Date();

      switch (dateRange) {
        case "week":
          startDate.setDate(now.getDate() - 7);
          break;
        case "month":
          startDate.setDate(now.getDate() - 30);
          break;
        case "3months":
          startDate.setDate(now.getDate() - 90);
          break;
        case "year":
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      query.createdAt = { $gte: startDate, $lte: now };
    }

    // Tags filter
    if (tags) {
      const tagArray = tags.split(",").map((t) => t.trim());
      query.tags = { $in: tagArray };
    }

    // Sort
    let sortObj = {};
    switch (sort) {
      case "date":
        sortObj = { createdAt: -1 };
        break;
      case "views":
        sortObj = { views: -1 };
        break;
      case "likes":
        sortObj = { likes: -1 };
        break;
      default:
        // Default to date sorting instead of text score (no text index)
        sortObj = { createdAt: -1 };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Post.countDocuments(query);
    const posts = await Post.find(query)
      .sort(sortObj)
      .skip(skip)
      .limit(parseInt(limit))
      .select("title slug description author date tags views likes readTime category")
      .lean();

    res.json({
      posts,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).json({ message: "Failed to perform search" });
  }
});

// Get search filters
router.get("/search/filters", async (req, res) => {
  try {
    const categories = await Post.distinct("category");
    const tags = await Post.distinct("tags");

    res.json({
      categories: categories.filter(Boolean),
      tags: tags.filter(Boolean).slice(0, 50),
    });
  } catch (error) {
    console.error("Filters error:", error);
    res.status(500).json({ message: "Failed to fetch filters" });
  }
});

// Like a post
router.post("/:postId/like", auth, async (req, res) => {
  try {
    let engagement = await Engagement.findOne({
      userId: req.userId,
      postId: req.params.postId,
    });

    if (!engagement) {
      engagement = new Engagement({
        userId: req.userId,
        postId: req.params.postId,
      });
    }

    engagement.liked = !engagement.liked;
    await engagement.save();

    // Update post likes count
    const likeCount = await Engagement.countDocuments({
      postId: req.params.postId,
      liked: true,
    });

    await Post.findByIdAndUpdate(req.params.postId, { likes: likeCount });

    res.json({
      userLiked: engagement.liked,
      likes: likeCount,
    });
  } catch (error) {
    console.error("Like error:", error);
    res.status(500).json({ message: "Failed to like post" });
  }
});

// Bookmark a post
router.post("/:postId/bookmark", auth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: "Post not found" });

    let bookmark = await Bookmark.findOne({
      userId: req.userId,
      postId: req.params.postId,
    });

    if (!bookmark) {
      bookmark = new Bookmark({
        userId: req.userId,
        postId: req.params.postId,
        totalWords: post.content?.split(/\s+/).length || 0,
      });
      await bookmark.save();
    } else {
      await Bookmark.deleteOne({ _id: bookmark._id });
    }

    res.json({
      userBookmarked: !!bookmark,
    });
  } catch (error) {
    console.error("Bookmark error:", error);
    res.status(500).json({ message: "Failed to bookmark post" });
  }
});

// Track share
router.post("/:postId/share", auth, async (req, res) => {
  try {
    const { platform = "copy" } = req.body;

    let engagement = await Engagement.findOne({
      userId: req.userId,
      postId: req.params.postId,
    });

    if (!engagement) {
      engagement = new Engagement({
        userId: req.userId,
        postId: req.params.postId,
      });
    }

    if (engagement.shares[platform] !== undefined) {
      engagement.shares[platform]++;
    }

    engagement.shares.total = Object.values(engagement.shares).reduce(
      (a, b) => a + b,
      0
    );

    await engagement.save();

    res.json({ success: true });
  } catch (error) {
    console.error("Share tracking error:", error);
    res.status(500).json({ message: "Failed to track share" });
  }
});

// Get bookmarks
router.get("/bookmarks", auth, async (req, res) => {
  try {
    const bookmarks = await Bookmark.find({ userId: req.userId })
      .populate({
        path: "postId",
        select: "title slug description author date readTime",
      })
      .sort({ savedAt: -1 });

    const readingHistory = await ReadingHistory.find({ userId: req.userId })
      .populate({
        path: "postId",
        select: "title slug",
      })
      .sort({ readAt: -1 })
      .limit(20);

    const formattedBookmarks = bookmarks.map((b) => ({
      _id: b._id,
      postId: b.postId._id,
      title: b.postId.title,
      slug: b.postId.slug,
      author: b.postId.author,
      readTime: b.postId.readTime,
      date: b.postId.date,
      savedAt: b.savedAt,
      readingProgress: b.readingProgress,
      totalWords: b.totalWords,
      wordsRead: b.wordsRead,
      status: b.status,
      estimatedTimeLeft: b.estimatedTimeLeft,
    }));

    const formattedHistory = readingHistory.map((h) => ({
      postId: h.postId._id,
      title: h.postId.title,
      slug: h.postId.slug,
      readAt: h.readAt,
      progress: h.progress,
    }));

    res.json({
      savedArticles: formattedBookmarks,
      readingHistory: formattedHistory,
    });
  } catch (error) {
    console.error("Bookmarks error:", error);
    res.status(500).json({ message: "Failed to fetch bookmarks" });
  }
});

// Update reading progress
router.put("/bookmarks/:bookmarkId/progress", auth, async (req, res) => {
  try {
    const { progress, timeSpent, wordsRead } = req.body;

    const bookmark = await Bookmark.findById(req.params.bookmarkId);
    if (!bookmark) return res.status(404).json({ message: "Bookmark not found" });

    bookmark.readingProgress = progress;
    bookmark.wordsRead = wordsRead || 0;

    if (progress >= 90) {
      bookmark.status = "completed";
      bookmark.completedAt = new Date();
    } else if (progress > 0) {
      bookmark.status = "reading";
    }

    bookmark.lastReadAt = new Date();

    const readingTime = bookmark.totalWords / 200; // Average reading speed
    bookmark.estimatedTimeLeft = Math.max(0, Math.round(readingTime * (1 - progress / 100)));

    await bookmark.save();

    // Track reading history
    await ReadingHistory.updateOne(
      { userId: req.userId, postId: bookmark.postId },
      {
        $set: {
          progress,
          timeSpent: (timeSpent || 0),
          readAt: new Date(),
        },
      },
      { upsert: true }
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Progress update error:", error);
    res.status(500).json({ message: "Failed to update progress" });
  }
});

// Delete bookmark
router.delete("/bookmarks/:bookmarkId", auth, async (req, res) => {
  try {
    await Bookmark.findByIdAndDelete(req.params.bookmarkId);
    res.json({ success: true });
  } catch (error) {
    console.error("Delete bookmark error:", error);
    res.status(500).json({ message: "Failed to delete bookmark" });
  }
});

// Get personalized recommendations
router.get("/recommendations/personalized", auth, async (req, res) => {
  try {
    const { limit = 6, postId } = req.query;

    // Get user's reading history
    const readingHistory = await ReadingHistory.find({ userId: req.userId })
      .sort({ readAt: -1 })
      .limit(10);

    const userTags = [];
    if (readingHistory.length > 0) {
      const userPosts = await Post.find({
        _id: { $in: readingHistory.map((h) => h.postId) },
      });

      userPosts.forEach((post) => {
        if (post.tags) userTags.push(...post.tags);
      });
    }

    // Build recommendation query
    let recommendationQuery = {};

    if (postId) {
      const currentPost = await Post.findById(postId);
      if (currentPost && currentPost.tags) {
        recommendationQuery.tags = { $in: currentPost.tags };
        recommendationQuery._id = { $ne: postId };
      }
    } else if (userTags.length > 0) {
      recommendationQuery.tags = { $in: userTags };
    }

    // Get trending posts as fallback
    const trendingPosts = await Post.find({})
      .sort({ views: -1, likes: -1 })
      .limit(parseInt(limit))
      .lean();

    const recommendations = await Post.find(recommendationQuery)
      .sort({ views: -1, likes: -1 })
      .limit(parseInt(limit))
      .lean();

    const finalRecommendations = recommendations.length > 0 ? recommendations : trendingPosts;

    const postsWithScores = finalRecommendations.map((post) => {
      let matchScore = Math.random() * 40 + 60; // 60-100%
      let matchReason = "trending";

      if (userTags.some((tag) => post.tags?.includes(tag))) {
        matchScore = Math.min(100, matchScore + 15);
        matchReason = "tag_match";
      }

      if (post.views > 100) {
        matchReason = "trending";
      }

      return {
        ...post,
        matchScore: Math.round(matchScore),
        matchReason,
      };
    });

    res.json(postsWithScores);
  } catch (error) {
    console.error("Recommendations error:", error);
    res.status(500).json({ message: "Failed to fetch recommendations" });
  }
});

// Get engagement for a post
router.get("/:postId/engagement", auth, async (req, res) => {
  try {
    let engagement = await Engagement.findOne({
      userId: req.userId,
      postId: req.params.postId,
    });

    if (!engagement) {
      engagement = new Engagement({
        userId: req.userId,
        postId: req.params.postId,
      });
    }

    const post = await Post.findById(req.params.postId).select("likes comments views");

    res.json({
      likes: post?.likes || 0,
      comments: post?.comments || 0,
      shares: Object.values(engagement.shares).reduce((a, b) => a + b, 0),
      userLiked: engagement.liked,
      userBookmarked: !!(await Bookmark.findOne({
        userId: req.userId,
        postId: req.params.postId,
      })),
      shareCount: engagement.shares,
    });
  } catch (error) {
    console.error("Engagement error:", error);
    res.status(500).json({ message: "Failed to fetch engagement" });
  }
});

export default router;
