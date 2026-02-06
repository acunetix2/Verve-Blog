import mongoose from 'mongoose';

const ReviewSchema = new mongoose.Schema({
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Review content
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  title: {
    type: String,
    required: true,
    maxlength: 100
  },
  comment: {
    type: String,
    required: true,
    maxlength: 1000
  },
  
  // Helpful votes
  helpfulCount: {
    type: Number,
    default: 0
  },
  unhelpfulCount: {
    type: Number,
    default: 0
  },
  
  // Moderation
  isApproved: {
    type: Boolean,
    default: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  
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

// Compound index to prevent duplicate reviews
ReviewSchema.index({ courseId: 1, userId: 1 }, { unique: true });
ReviewSchema.index({ courseId: 1, rating: -1 });

export default mongoose.model('Review', ReviewSchema);
