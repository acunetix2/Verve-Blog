import express from "express";
import User from "../models/User.js";
import Post from "../models/Post.js";
import jwt from "jsonwebtoken";

const router = express.Router();

// Middleware for authentication
const auth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token provided" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = decoded.id;
    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

// Get user profile
router.get("/profile", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    // Get user's posts for statistics
    const userPosts = await Post.find({ authorId: req.userId });
    
    const totalViews = userPosts.reduce((sum, post) => sum + post.views, 0);
    const totalLikes = userPosts.reduce((sum, post) => sum + post.likes, 0);

    // Calculate achievements
    const achievements = [
      {
        id: "first_post",
        title: "First Step",
        description: "Published your first article",
        progress: userPosts.length,
        maxProgress: 1,
        icon: "📝",
        completed: userPosts.length >= 1,
      },
      {
        id: "five_posts",
        title: "Content Creator",
        description: "Published 5 articles",
        progress: Math.min(userPosts.length, 5),
        maxProgress: 5,
        icon: "✍️",
        completed: userPosts.length >= 5,
      },
      {
        id: "hundred_views",
        title: "Reader Magnet",
        description: "Reach 100 total views",
        progress: Math.min(totalViews, 100),
        maxProgress: 100,
        icon: "👀",
        completed: totalViews >= 100,
      },
      {
        id: "fifty_likes",
        title: "Community Favorite",
        description: "Receive 50 likes",
        progress: Math.min(totalLikes, 50),
        maxProgress: 50,
        icon: "❤️",
        completed: totalLikes >= 50,
      },
    ];

    // Auto-unlock badges based on achievements
    const badges = [];
    if (userPosts.length >= 1) {
      badges.push({
        id: "first_post_badge",
        name: "Debut Author",
        description: "Published your first post",
        icon: "🎯",
        unlockedDate: user.createdAt,
        color: "#3b82f6",
      });
    }
    if (userPosts.length >= 5) {
      badges.push({
        id: "prolific_author",
        name: "Prolific Author",
        description: "Published 5+ articles",
        icon: "🚀",
        unlockedDate: new Date(),
        color: "#8b5cf6",
      });
    }
    if (totalLikes >= 50) {
      badges.push({
        id: "community_star",
        name: "Community Star",
        description: "50+ likes on your content",
        icon: "⭐",
        unlockedDate: new Date(),
        color: "#f59e0b",
      });
    }

    const response = {
      _id: user._id,
      name: user.name || user.email.split("@")[0],
      email: user.email,
      bio: user.bio || "No bio yet",
      location: user.location || "",
      website: user.website || "",
      github: user.github || "",
      linkedin: user.linkedin || "",
      twitter: user.twitter || "",
      profileImage: user.profileImage || "",
      joinDate: user.createdAt,
      totalPosts: userPosts.length,
      totalViews,
      totalLikes,
      badges: [...(user.badges || []), ...badges],
      achievements,
      stats: {
        postsPublished: userPosts.length,
        articlesRead: user.stats?.articlesRead || 0,
        resourcesShared: user.stats?.resourcesShared || 0,
        communitiesJoined: user.stats?.communitiesJoined || 0,
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Profile error:", error);
    res.status(500).json({ message: "Failed to fetch profile" });
  }
});

// Update user profile
router.put("/profile", auth, async (req, res) => {
  try {
    const { name, bio, location, website, github, linkedin, twitter, profileImage } = req.body;

    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        name,
        bio,
        location,
        website,
        github,
        linkedin,
        twitter,
        profileImage,
      },
      { new: true }
    ).select("-password");

    res.json(user);
  } catch (error) {
    console.error("Update profile error:", error);
    res.status(500).json({ message: "Failed to update profile" });
  }
});

// Update theme settings
router.put("/settings/theme", auth, async (req, res) => {
  try {
    const { theme, contrast, fontSize, useSystemFont, animationReduces } = req.body;

    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        themeSettings: {
          theme,
          contrast,
          fontSize,
          useSystemFont,
          animationReduces,
        },
      },
      { new: true }
    ).select("-password");

    res.json(user.themeSettings);
  } catch (error) {
    console.error("Theme settings error:", error);
    res.status(500).json({ message: "Failed to update theme settings" });
  }
});

// Get user's badges
router.get("/badges", auth, async (req, res) => {
  try {
    const user = await User.findById(req.userId).select("badges");
    res.json(user?.badges || []);
  } catch (error) {
    console.error("Badges error:", error);
    res.status(500).json({ message: "Failed to fetch badges" });
  }
});

// Get public user profile
router.get("/:userId", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    // Get user's public posts
    const userPosts = await Post.find({ authorId: req.params.userId, published: true });

    const totalViews = userPosts.reduce((sum, post) => sum + post.views, 0);
    const totalLikes = userPosts.reduce((sum, post) => sum + post.likes, 0);

    res.json({
      _id: user._id,
      name: user.name || user.email.split("@")[0],
      email: user.email,
      bio: user.bio,
      location: user.location,
      website: user.website,
      github: user.github,
      linkedin: user.linkedin,
      twitter: user.twitter,
      profileImage: user.profileImage,
      totalPosts: userPosts.length,
      totalViews,
      totalLikes,
      badges: user.badges || [],
    });
  } catch (error) {
    console.error("Public profile error:", error);
    res.status(500).json({ message: "Failed to fetch user profile" });
  }
});

export default router;
