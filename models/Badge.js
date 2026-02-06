import mongoose from 'mongoose';

const BadgeSchema = new mongoose.Schema({
  // Badge definition
  name: {
    type: String,
    required: true,
    unique: true
  },
  description: String,
  icon: String, // URL to badge icon
  category: {
    type: String,
    enum: ['course', 'engagement', 'skill', 'milestone', 'special'],
    default: 'skill'
  },
  
  // Earning criteria
  criteria: {
    type: {
      type: String,
      enum: ['courses_completed', 'lessons_completed', 'quiz_score', 'participation', 'streak', 'custom'],
      required: true
    },
    value: Number, // e.g., number of courses, quiz score %, etc.
    courseId: mongoose.Schema.Types.ObjectId // For course-specific badges
  },
  
  // Badge properties
  color: String,
  rarity: {
    type: String,
    enum: ['common', 'rare', 'epic', 'legendary'],
    default: 'common'
  },
  points: {
    type: Number,
    default: 10
  },
  
  // Metadata
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// User Badge Achievement
const UserBadgeSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  badgeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Badge',
    required: true
  },
  
  // Achievement tracking
  earnedAt: {
    type: Date,
    default: Date.now
  },
  isPublic: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

UserBadgeSchema.index({ userId: 1, badgeId: 1 }, { unique: true });
UserBadgeSchema.index({ userId: 1, earnedAt: -1 });

export const Badge = mongoose.model('Badge', BadgeSchema);
export const UserBadge = mongoose.model('UserBadge', UserBadgeSchema);
