import mongoose from 'mongoose';

const LessonSchema = new mongoose.Schema({
  title: { type: String, required: true },
  contentUrl: { type: String }, // B2 URL or inline content
  content: { type: String }, // Fallback for small content
  contentB2FileId: { type: String }, // B2 file identifier
  quiz: [{
    question: String,
    options: [String],
    answer: String
  }],
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