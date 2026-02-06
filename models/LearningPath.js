import mongoose from 'mongoose';

const LearningPathSchema = new mongoose.Schema({
  // Path metadata
  title: {
    type: String,
    required: true
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  description: String,
  image: String,
  
  // Content structure
  courses: [{
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true
    },
    order: {
      type: Number,
      required: true
    },
    isPrerequisite: {
      type: Boolean,
      default: false
    },
    requiredCompletionPercentage: {
      type: Number,
      default: 100
    }
  }],
  
  // Path properties
  difficulty: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  estimatedDuration: Number, // in hours
  skills: [String], // Skills gained after completing path
  
  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  enrollmentCount: {
    type: Number,
    default: 0
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// User Learning Path Progress
const UserLearningPathProgressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  pathId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LearningPath',
    required: true
  },
  
  // Progress tracking
  completedCourses: [{
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course'
    },
    completedAt: Date
  }],
  
  overallProgress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // Milestone tracking
  currentCourseIndex: {
    type: Number,
    default: 0
  },
  
  // Status
  status: {
    type: String,
    enum: ['in_progress', 'completed', 'paused'],
    default: 'in_progress'
  },
  completedAt: Date,
  
  // Engagement
  lastAccessedAt: {
    type: Date,
    default: Date.now
  },
  
  enrolledAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

UserLearningPathProgressSchema.index({ userId: 1, pathId: 1 }, { unique: true });
UserLearningPathProgressSchema.index({ userId: 1, status: 1 });

export const LearningPath = mongoose.model('LearningPath', LearningPathSchema);
export const UserLearningPathProgress = mongoose.model('UserLearningPathProgress', UserLearningPathProgressSchema);
