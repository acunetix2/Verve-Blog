import express from 'express';
import mongoose from 'mongoose';
import { authMiddleware } from '../middleware/auth.js';
import Review from '../models/Review.js';
import { Badge, UserBadge } from '../models/Badge.js';
import Recommendation from '../models/Recommendation.js';
import Course from '../models/Course.js';
import User from '../models/User.js';
import UserProgress from '../models/UserProgress.js';

const router = express.Router();

// ============================================================
// COURSE REVIEWS ENDPOINTS
// ============================================================

// Get reviews for a course
router.get('/reviews/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
    const { page = 1, limit = 10, sortBy = 'recent' } = req.query;

    const skip = (page - 1) * limit;
    const sortOptions = {
      recent: { createdAt: -1 },
      rating: { rating: -1 },
      helpful: { helpfulCount: -1 }
    };

    const reviews = await Review.find({
      courseId,
      isApproved: true,
      isDeleted: false
    })
      .populate('userId', 'name email avatar')
      .sort(sortOptions[sortBy] || sortOptions.recent)
      .skip(skip)
      .limit(limit);

    const total = await Review.countDocuments({
      courseId,
      isApproved: true,
      isDeleted: false
    });

    // Get course rating stats
    const stats = await Review.aggregate([
      {
        $match: {
          courseId: mongoose.Types.ObjectId(courseId),
          isApproved: true,
          isDeleted: false
        }
      },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
          fiveStars: { $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] } },
          fourStars: { $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] } },
          threeStars: { $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] } },
          twoStars: { $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] } },
          oneStar: { $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] } }
        }
      }
    ]);

    res.json({
      success: true,
      reviews,
      stats: stats[0] || { avgRating: 0, totalReviews: 0 },
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reviews'
    });
  }
});

// Create a review
router.post('/reviews/:courseId', authMiddleware, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { rating, title, comment } = req.body;
    const userId = req.user.id;

    // Validate inputs
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: 'Rating must be between 1 and 5'
      });
    }

    if (!title || !comment) {
      return res.status(400).json({
        success: false,
        message: 'Title and comment are required'
      });
    }

    // Check if user is enrolled in course
    const progress = await UserProgress.findOne({ userId, courseId });
    if (!progress) {
      return res.status(403).json({
        success: false,
        message: 'You must be enrolled in this course to review it'
      });
    }

    // Check for existing review
    const existingReview = await Review.findOne({ courseId, userId });
    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'You already have a review for this course'
      });
    }

    // Create review
    const review = new Review({
      courseId,
      userId,
      rating,
      title,
      comment
    });

    await review.save();
    await review.populate('userId', 'name email avatar');

    res.status(201).json({
      success: true,
      message: 'Review created successfully',
      review
    });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create review'
    });
  }
});

// Edit a review
router.put('/reviews/:reviewId', authMiddleware, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, title, comment } = req.body;
    const userId = req.user.id;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    if (review.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own reviews'
      });
    }

    if (rating) review.rating = rating;
    if (title) review.title = title;
    if (comment) review.comment = comment;

    await review.save();
    await review.populate('userId', 'name email avatar');

    res.json({
      success: true,
      message: 'Review updated successfully',
      review
    });
  } catch (error) {
    console.error('Edit review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to edit review'
    });
  }
});

// Delete a review
router.delete('/reviews/:reviewId', authMiddleware, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user.id;

    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review not found'
      });
    }

    if (review.userId.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own reviews'
      });
    }

    review.isDeleted = true;
    await review.save();

    res.json({
      success: true,
      message: 'Review deleted successfully'
    });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete review'
    });
  }
});

// ============================================================
// BADGES & ACHIEVEMENTS ENDPOINTS
// ============================================================

// Get all available badges
router.get('/badges', async (req, res) => {
  try {
    const badges = await Badge.find().sort({ category: 1, rarity: 1 });

    res.json({
      success: true,
      badges
    });
  } catch (error) {
    console.error('Get badges error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch badges'
    });
  }
});

// Get user's earned badges
router.get('/badges/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    const userBadges = await UserBadge.find({ userId })
      .populate('badgeId')
      .sort({ earnedAt: -1 });

    const totalPoints = userBadges.reduce((sum, ub) => sum + (ub.badgeId.points || 0), 0);

    res.json({
      success: true,
      badges: userBadges,
      totalPoints
    });
  } catch (error) {
    console.error('Get user badges error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user badges'
    });
  }
});

// Award badge to user (admin only)
router.post('/badges/award', authMiddleware, async (req, res) => {
  try {
    const { userId, badgeId } = req.body;

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Only admins can award badges'
      });
    }

    const badge = await Badge.findById(badgeId);
    if (!badge) {
      return res.status(404).json({
        success: false,
        message: 'Badge not found'
      });
    }

    // Check if user already has badge
    const existing = await UserBadge.findOne({ userId, badgeId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'User already has this badge'
      });
    }

    const userBadge = new UserBadge({ userId, badgeId });
    await userBadge.save();

    res.status(201).json({
      success: true,
      message: 'Badge awarded successfully',
      userBadge
    });
  } catch (error) {
    console.error('Award badge error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to award badge'
    });
  }
});

// ============================================================
// RECOMMENDATIONS ENDPOINTS
// ============================================================

// Get personalized course recommendations
router.get('/recommendations/personalized', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { limit = 5 } = req.query;

    // Get user's enrolled courses
    const enrolledCourses = await UserProgress.find({ userId }).select('courseId');
    const enrolledIds = enrolledCourses.map(e => e.courseId);

    // Get recommendations for this user
    const recommendations = await Recommendation.find({
      userId,
      enrolled: false
    })
      .populate('courseId', 'title description image imageUrl difficulty')
      .sort({ score: -1 })
      .limit(limit);

    // If no recommendations, generate some based on similar courses
    if (recommendations.length === 0 && enrolledIds.length > 0) {
      const enrolledCourseDetails = await Course.find({
        _id: { $in: enrolledIds }
      }).select('categories tier');

      const categories = [...new Set(enrolledCourseDetails.flatMap(c => c.categories || []))];

      const suggestedCourses = await Course.find({
        _id: { $nin: enrolledIds },
        status: 'published',
        $or: [
          { categories: { $in: categories } },
          { tier: 'free' }
        ]
      })
        .limit(limit)
        .select('title description image imageUrl difficulty');

      return res.json({
        success: true,
        recommendations: suggestedCourses,
        source: 'suggested'
      });
    }

    res.json({
      success: true,
      recommendations,
      source: 'personalized'
    });
  } catch (error) {
    console.error('Get recommendations error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recommendations'
    });
  }
});

// Trending courses this week
router.get('/recommendations/trending', async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const trendingCourses = await UserProgress.aggregate([
      {
        $match: {
          enrolledAt: { $gte: weekAgo }
        }
      },
      {
        $group: {
          _id: '$courseId',
          enrollments: { $sum: 1 }
        }
      },
      {
        $sort: { enrollments: -1 }
      },
      {
        $limit: limit
      },
      {
        $lookup: {
          from: 'courses',
          localField: '_id',
          foreignField: '_id',
          as: 'course'
        }
      }
    ]);

    const courses = trendingCourses.map(t => ({
      ...t.course[0],
      enrollments: t.enrollments
    }));

    res.json({
      success: true,
      courses
    });
  } catch (error) {
    console.error('Get trending courses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trending courses'
    });
  }
});

export default router;
