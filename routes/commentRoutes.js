import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import Comment from '../models/Comment.js';
import User from '../models/User.js';

const router = express.Router();

// ============================================================
// GET ENDPOINTS
// ============================================================

// Get all comments for a content item
router.get('/:contentType/:contentId', async (req, res) => {
  try {
    const { contentType, contentId } = req.params;
    const { page = 1, limit = 20 } = req.query;

    // Validate contentType
    const validTypes = ['course', 'lesson', 'post', 'document'];
    if (!validTypes.includes(contentType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid content type'
      });
    }

    // Get top-level comments with pagination
    const skip = (page - 1) * limit;
    const comments = await Comment.find({
      contentType,
      contentId,
      parentCommentId: null,
      isDeleted: false
    })
      .populate('userId', 'name email avatar')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Get reply count for each comment
    const commentsWithReplies = await Promise.all(
      comments.map(async (comment) => {
        const replyCount = await Comment.countDocuments({
          parentCommentId: comment._id,
          isDeleted: false
        });
        return {
          ...comment.toObject(),
          replyCount
        };
      })
    );

    const total = await Comment.countDocuments({
      contentType,
      contentId,
      parentCommentId: null,
      isDeleted: false
    });

    res.json({
      success: true,
      comments: commentsWithReplies,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get comments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch comments'
    });
  }
});

// Get replies for a specific comment
router.get('/replies/:commentId', async (req, res) => {
  try {
    const { commentId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    const skip = (page - 1) * limit;
    const replies = await Comment.find({
      parentCommentId: commentId,
      isDeleted: false
    })
      .populate('userId', 'name email avatar')
      .sort({ createdAt: 1 })
      .skip(skip)
      .limit(limit);

    const total = await Comment.countDocuments({
      parentCommentId: commentId,
      isDeleted: false
    });

    res.json({
      success: true,
      replies,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('Get replies error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch replies'
    });
  }
});

// ============================================================
// POST ENDPOINTS
// ============================================================

// Create a new comment
router.post('/:contentType/:contentId', authMiddleware, async (req, res) => {
  try {
    const { contentType, contentId } = req.params;
    const { text, parentCommentId = null } = req.body;
    const userId = req.user.id;

    // Validate inputs
    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Comment text is required'
      });
    }

    if (text.length > 5000) {
      return res.status(400).json({
        success: false,
        message: 'Comment exceeds maximum length of 5000 characters'
      });
    }

    // Validate contentType
    const validTypes = ['course', 'lesson', 'post', 'document'];
    if (!validTypes.includes(contentType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid content type'
      });
    }

    // If replying to a comment, verify parent comment exists
    if (parentCommentId) {
      const parentComment = await Comment.findById(parentCommentId);
      if (!parentComment || parentComment.isDeleted) {
        return res.status(404).json({
          success: false,
          message: 'Parent comment not found'
        });
      }
    }

    // Create comment
    const comment = new Comment({
      contentType,
      contentId,
      userId,
      text: text.trim(),
      parentCommentId: parentCommentId || null
    });

    await comment.save();

    // Populate user details
    await comment.populate('userId', 'name email avatar');

    res.status(201).json({
      success: true,
      message: 'Comment created successfully',
      comment
    });
  } catch (error) {
    console.error('Create comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create comment'
    });
  }
});

// ============================================================
// PUT ENDPOINTS
// ============================================================

// Edit a comment
router.put('/:commentId', authMiddleware, async (req, res) => {
  try {
    const { commentId } = req.params;
    const { text } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Comment text is required'
      });
    }

    if (text.length > 5000) {
      return res.status(400).json({
        success: false,
        message: 'Comment exceeds maximum length of 5000 characters'
      });
    }

    // Find comment
    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Verify ownership
    if (comment.userId.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit your own comments'
      });
    }

    // Update comment
    comment.text = text.trim();
    comment.isEdited = true;
    comment.editedAt = new Date();
    await comment.save();

    await comment.populate('userId', 'name email avatar');

    res.json({
      success: true,
      message: 'Comment updated successfully',
      comment
    });
  } catch (error) {
    console.error('Edit comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to edit comment'
    });
  }
});

// Like/Unlike a comment
router.post('/:commentId/like', authMiddleware, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    const hasLiked = comment.likes.includes(userId);

    if (hasLiked) {
      // Unlike
      comment.likes = comment.likes.filter(id => id.toString() !== userId);
      comment.likeCount = Math.max(0, comment.likeCount - 1);
    } else {
      // Like
      comment.likes.push(userId);
      comment.likeCount = (comment.likeCount || 0) + 1;
    }

    await comment.save();

    await comment.populate('userId', 'name email avatar');

    res.json({
      success: true,
      liked: !hasLiked,
      likeCount: comment.likeCount,
      comment
    });
  } catch (error) {
    console.error('Like comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to like comment'
    });
  }
});

// ============================================================
// DELETE ENDPOINTS
// ============================================================

// Delete a comment (soft delete)
router.delete('/:commentId', authMiddleware, async (req, res) => {
  try {
    const { commentId } = req.params;
    const userId = req.user.id;

    const comment = await Comment.findById(commentId);
    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found'
      });
    }

    // Verify ownership (or admin)
    if (comment.userId.toString() !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You can only delete your own comments'
      });
    }

    // Soft delete
    comment.isDeleted = true;
    comment.deletedAt = new Date();
    comment.text = '[deleted]';
    await comment.save();

    res.json({
      success: true,
      message: 'Comment deleted successfully'
    });
  } catch (error) {
    console.error('Delete comment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete comment'
    });
  }
});

export default router;
