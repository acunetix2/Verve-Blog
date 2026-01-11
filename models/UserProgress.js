import mongoose from 'mongoose';

const UserProgressSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  completedLessons: [{
    lessonId: String,
    completedAt: Date,
    quizScore: Number
  }],
  enrolledAt: { type: Date, default: Date.now },
  lastAccessed: { type: Date, default: Date.now }
});

export default mongoose.model('UserProgress', UserProgressSchema);