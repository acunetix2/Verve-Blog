import mongoose from 'mongoose';

const CommentSchema = new mongoose.Schema({
  // Reference to what is being commented on
  contentType: {
    type: String,
    enum: ['course', 'lesson', 'post', 'document'],
    required: true
  },
  contentId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'contentType' // Dynamic ref based on contentType
  },
  
  // Comment content
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  text: {
    type: String,
    required: true,
    minlength: 1,
    maxlength: 5000
  },
  
  // Replies/Nested comments
  parentCommentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment',
    default: null // null if top-level comment
  },
  
  // Engagement
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  likeCount: {
    type: Number,
    default: 0
  },
  
  // Moderation
  isEdited: {
    type: Boolean,
    default: false
  },
  editedAt: Date,
  isDeleted: {
    type: Boolean,
    default: false
  },
  deletedAt: Date,
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Indexes for efficient querying
CommentSchema.index({ contentType: 1, contentId: 1, createdAt: -1 });
CommentSchema.index({ userId: 1, createdAt: -1 });
CommentSchema.index({ parentCommentId: 1 });

export default mongoose.model('Comment', CommentSchema);
