import mongoose from 'mongoose';

// Structured content block for lessons
const ContentBlockSchema = new mongoose.Schema({
  type: { type: String, enum: ['text', 'header', 'subheader', 'points', 'highlight'], required: true },
  content: { type: String, required: true },
  color: { type: String, default: 'slate' }, // 'blue', 'green', 'purple', 'orange', 'red', 'slate'
  order: { type: Number, default: 0 }
}, { _id: false });

// Quiz question schema
const QuizQuestionSchema = new mongoose.Schema({
  question: { type: String, required: true },
  options: [{ type: String, required: true }],
  correctAnswer: { type: String, required: true },
  explanation: { type: String }, // Optional explanation for the correct answer
  order: { type: Number, default: 0 }
}, { _id: false });

// Final exam schema (30 questions multiple choice)
const FinalExamSchema = new mongoose.Schema({
  questions: [QuizQuestionSchema],
  passingScore: { type: Number, default: 70 },
  duration: { type: Number }, // Duration in minutes (optional)
  isEnabled: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

const LessonSchema = new mongoose.Schema({
  title: { type: String, required: true },
  contentUrl: { type: String }, // B2 URL or inline content
  content: { type: String }, // Legacy fallback for small content
  contentBlocks: [ContentBlockSchema], // New structured content
  contentB2FileId: { type: String }, // B2 file identifier
  quiz: [QuizQuestionSchema], // Lesson quiz
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

const ModuleSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  lessons: [LessonSchema],
  order: { type: Number, default: 0 }
});

const CourseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, index: true, unique: false },
  description: String,
  imageUrl: { type: String }, // B2 URL for course image
  imageB2FileId: { type: String }, // B2 file identifier
  modules: [ModuleSchema],
  finalExam: FinalExamSchema, // Final exam for the course
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Generate a URL-friendly slug from the title when saving
CourseSchema.pre('save', function (next) {
  if (this.title && !this.slug) {
    this.slug = this.title
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  }
  next();
});

// Clean up enrollments when course is deleted
CourseSchema.pre('findByIdAndDelete', async function (next) {
  try {
    const courseId = this.getOptions().new ? this.getOptions()._id : this._conditions._id;
    if (courseId) {
      // Remove this course from all users' enrolledCourses
      const User = mongoose.model('User');
      await User.updateMany(
        { 'enrolledCourses.courseId': courseId },
        { $pull: { enrolledCourses: { courseId } } }
      );
    }
    next();
  } catch (err) {
    console.error('Error cleaning up enrollments:', err);
    next();
  }
});

export default mongoose.model('Course', CourseSchema);