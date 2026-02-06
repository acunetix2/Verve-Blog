import express from 'express';
import mongoose from 'mongoose';
import { authMiddleware } from '../middleware/auth.js';
import Wishlist from '../models/Wishlist.js';
import Course from '../models/Course.js';
import User from '../models/User.js';
import UserProgress from '../models/UserProgress.js';
import { UserBadge } from '../models/Badge.js';
import Certificate from '../models/Certificate.js';

const router = express.Router();

// ============================================================
// WISHLIST ENDPOINTS
// ============================================================

// Get user's wishlist
router.get('/wishlist', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 12 } = req.query;

    const skip = (page - 1) * limit;
    const wishlistItems = await Wishlist.find({ userId })
      .populate('courseId', 'title description image imageUrl difficulty tier pricing rating')
      .sort({ addedAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Wishlist.countDocuments({ userId });

    res.json({
      success: true,
      wishlist: wishlistItems,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wishlist'
    });
  }
});

// Add to wishlist
router.post('/wishlist/:courseId', authMiddleware, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { notes, notifyOnPrice, priceDropThreshold } = req.body;
    const userId = req.user.id;

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({
        success: false,
        message: 'Course not found'
      });
    }

    // Check if already in wishlist
    const existing = await Wishlist.findOne({ userId, courseId });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Course already in your wishlist'
      });
    }

    const wishlistItem = new Wishlist({
      userId,
      courseId,
      notes,
      notifyOnPrice,
      priceDropThreshold,
      savedPrice: course.pricing?.oneTimeFee || 0
    });

    await wishlistItem.save();
    await wishlistItem.populate('courseId', 'title description image imageUrl');

    res.status(201).json({
      success: true,
      message: 'Course added to wishlist',
      wishlistItem
    });
  } catch (error) {
    console.error('Add to wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add to wishlist'
    });
  }
});

// Remove from wishlist
router.delete('/wishlist/:courseId', authMiddleware, async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user.id;

    const result = await Wishlist.deleteOne({ userId, courseId });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        message: 'Item not found in wishlist'
      });
    }

    res.json({
      success: true,
      message: 'Course removed from wishlist'
    });
  } catch (error) {
    console.error('Remove from wishlist error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to remove from wishlist'
    });
  }
});

// ============================================================
// ENHANCED USER PROFILE ENDPOINTS
// ============================================================

// Get comprehensive user profile with stats
router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;

    // Get basic user info
    const user = await User.findById(userId).select('-password -refreshToken -two_factor_secret');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get learning stats
    const enrolledCourses = await UserProgress.countDocuments({ userId });
    const completedCourses = await Certificate.countDocuments({ userId });
    
    const totalLessonsCompleted = await UserProgress.aggregate([
      { $match: { userId: mongoose.Types.ObjectId(userId) } },
      { $group: { _id: null, total: { $sum: { $size: '$completedLessons' } } } }
    ]);

    // Get badges
    const badges = await UserBadge.find({ userId }).populate('badgeId');
    const totalPoints = badges.reduce((sum, ub) => sum + (ub.badgeId.points || 0), 0);

    // Get certificates
    const certificates = await Certificate.find({ userId });

    // Calculate learning streak (simplified)
    const recentProgress = await UserProgress.find({ userId })
      .sort({ 'completedLessons.completedAt': -1 })
      .limit(1);

    let streak = 0;
    if (recentProgress.length > 0) {
      const lastCompleted = recentProgress[0].completedLessons[0]?.completedAt;
      if (lastCompleted) {
        const daysSinceLastActivity = Math.floor((Date.now() - lastCompleted.getTime()) / (1000 * 60 * 60 * 24));
        streak = Math.max(0, daysSinceLastActivity <= 1 ? 1 : 0);
      }
    }

    res.json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        bio: user.bio,
        role: user.role,
        createdAt: user.createdAt
      },
      stats: {
        enrolledCourses,
        completedCourses,
        totalLessonsCompleted: totalLessonsCompleted[0]?.total || 0,
        badges: badges.length,
        totalPoints,
        streak,
        certificates: certificates.length
      },
      badges: badges.map(b => ({
        _id: b._id,
        badge: b.badgeId,
        earnedAt: b.earnedAt
      })),
      certificates: certificates.map(c => ({
        _id: c._id,
        courseTitle: c.courseTitle,
        certificateNumber: c.certificateNumber,
        completionDate: c.completionDate
      }))
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch user profile'
    });
  }
});

// Get learning analytics for authenticated user
router.get('/analytics/my-learning', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    // Time spent per course
    const courseStats = await UserProgress.find({ userId })
      .populate('courseId', 'title')
      .select('courseId completedLessons');

    // Quiz performance
    const quizStats = await UserProgress.aggregate([
      { $match: { userId: mongoose.Types.ObjectId(userId) } },
      { $unwind: '$completedLessons' },
      { $match: { 'completedLessons.quizScore': { $exists: true } } },
      {
        $group: {
          _id: null,
          avgQuizScore: { $avg: '$completedLessons.quizScore' },
          highestScore: { $max: '$completedLessons.quizScore' },
          lowestScore: { $min: '$completedLessons.quizScore' },
          totalQuizzes: { $sum: 1 }
        }
      }
    ]);

    // Learning activity (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const recentActivity = await UserProgress.aggregate([
      { $match: { userId: mongoose.Types.ObjectId(userId) } },
      { $unwind: '$completedLessons' },
      { $match: { 'completedLessons.completedAt': { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$completedLessons.completedAt' } },
          lessonsCompleted: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    res.json({
      success: true,
      analytics: {
        courseStats,
        quizPerformance: quizStats[0] || {
          avgQuizScore: 0,
          highestScore: 0,
          lowestScore: 0,
          totalQuizzes: 0
        },
        recentActivity
      }
    });
  } catch (error) {
    console.error('Get analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch learning analytics'
    });
  }
});

// Get learning timeline (progress over time)
router.get('/analytics/timeline', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const timeline = await UserProgress.aggregate([
      { $match: { userId: mongoose.Types.ObjectId(userId) } },
      {
        $project: {
          courseId: 1,
          enrolledAt: 1,
          completedCount: { $size: '$completedLessons' },
          lastAccessDate: '$lastAccessed'
        }
      },
      { $sort: { enrolledAt: -1 } }
    ]);

    res.json({
      success: true,
      timeline
    });
  } catch (error) {
    console.error('Get timeline error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch learning timeline'
    });
  }
});

export default router;
