import mongoose from 'mongoose';

const RecommendationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  
  // Why recommended
  reason: {
    type: String,
    enum: [
      'similar_to_enrolled',
      'trending',
      'based_on_skills',
      'popular_in_category',
      'completion_suggestion',
      'ai_personalized',
      'trending_this_week'
    ],
    required: true
  },
  
  // Scoring
  score: {
    type: Number,
    default: 0.5, // 0-1 score
    min: 0,
    max: 1
  },
  
  // Interaction tracking
  viewed: {
    type: Boolean,
    default: false
  },
  viewedAt: Date,
  
  clicked: {
    type: Boolean,
    default: false
  },
  clickedAt: Date,
  
  enrolled: {
    type: Boolean,
    default: false
  },
  enrolledAt: Date,
  
  // Timestamps
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    index: true,
    default: () => new Date(+new Date() + 30 * 24 * 60 * 60 * 1000) // 30 days
  }
}, { timestamps: true });

// Auto-delete expired recommendations
RecommendationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
RecommendationSchema.index({ userId: 1, courseId: 1 }, { unique: true });
RecommendationSchema.index({ userId: 1, score: -1 });

export default mongoose.model('Recommendation', RecommendationSchema);
