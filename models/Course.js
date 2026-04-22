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

// Resource schema for downloadable materials
const ResourceSchema = new mongoose.Schema({
  title: { type: String },
  description: String,
  type: { type: String, enum: ['pdf', 'code', 'checklist', 'template', 'other'] },
  url: { type: String }, // B2 URL
  fileSize: { type: Number }, // in bytes
  downloadCount: { type: Number, default: 0 },
  categories: { type: [String], default: ["Uncategorized"] }, // Array of categories for flexibility
  category: { type: String, default: "Uncategorized" }, // Legacy single category for backward compatibility
  createdAt: { type: Date, default: Date.now }
}, { _id: false });

const LessonSchema = new mongoose.Schema({
  title: { type: String, required: true },
  contentUrl: { type: String }, // B2 URL or inline content
  content: { type: String }, // Legacy fallback for small content
  contentBlocks: [ContentBlockSchema], // New structured content
  contentB2FileId: { type: String }, // B2 file identifier
  
  // Video support
  videoUrl: { type: String }, // URL to video (YouTube, Vimeo, custom)
  videoType: { type: String, enum: ['youtube', 'vimeo', 'custom'], default: 'custom' },
  videoDuration: { type: Number }, // Duration in seconds
  transcript: { type: String }, // Searchable transcript
  
  // Resources
  resources: [ResourceSchema],
  
  // Quiz
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

// Task schema for THM-style rooms
const TaskSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  content: { type: String }, // HTML/Markdown content
  contentBlocks: [ContentBlockSchema], // Structured content blocks
  questions: [
    {
      question: { type: String, required: true },
      hint: String,
      points: { type: Number, default: 8 },
      answer: { type: String, required: true }, // Correct answer
      order: { type: Number, default: 0 }
    }
  ],
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

// Section schema for THM-style rooms
const SectionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: String,
  tasks: [TaskSchema],
  order: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
}, { _id: true });

const CourseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  slug: { type: String, index: true, unique: false },
  description: String,
  imageUrl: { type: String }, // B2 URL for course image
  imageB2FileId: { type: String }, // B2 file identifier
  modules: [ModuleSchema], // Legacy support
  sections: [SectionSchema], // New THM-style sections
  finalExam: FinalExamSchema, // Final exam for the course
  status: { type: String, enum: ['draft', 'published'], default: 'draft' }, // Course status
  
  // TryHackMe Room features
  isRoom: { type: Boolean, default: true }, // Mark as "Room" instead of Course
  difficulty: { type: String, enum: ['Beginner', 'Intermediate', 'Advanced', 'Expert'], default: 'Beginner' },
  category: { type: String, default: 'General' },
  roomType: { type: String, enum: ['challenge', 'learning', 'ctf'], default: 'learning' },
  
  // Rewards system
  rewards: {
    badge: { name: String, icon: String, color: String },
    certificate: { type: Boolean, default: false },
    certificateTemplate: String, // Path to certificate template
    pointsPerQuestion: { type: Number, default: 8 },
    totalPoints: { type: Number, default: 0 }
  },
  
  // Questions and answers (legacy)
  questions: [
    {
      index: Number,
      question: String,
      hint: String,
      points: { type: Number, default: 8 },
      fileLocation: String,
      answer: String // Stored securely
    }
  ],
  
  // Pricing and Access Tiers
  tier: { type: String, enum: ['free', 'premium', 'enterprise'], default: 'free' },
  pricing: {
    oneTimeFee: { type: Number, default: 0 }, // One-time purchase price
    monthlyPrice: { type: Number, default: 0 }, // Monthly subscription price
    yearlyPrice: { type: Number, default: 0 }, // Yearly subscription price
    lifetimeAccess: { type: Boolean, default: false }, // Lifetime access available
    currency: { type: String, default: 'USD' },
  },
  
  // Access Control
  accessType: { 
    type: String, 
    enum: ['public', 'premium', 'subscription'], 
    default: 'public' 
  }, // 'public' = free, 'premium' = paid one-time, 'subscription' = recurring
  
  // Content upload support
  uploadedContent: {
    markdownFile: String, // Base64 or file path
    uploadedAt: Date,
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  },
  
  // Room statistics
  roomStats: {
    usersEnrolled: { type: Number, default: 0 },
    usersCompleted: { type: Number, default: 0 },
    averageRating: { type: Number, default: 0 },
    difficulty: String,
    timeEstimate: Number // in minutes
  },
  
  // Team Licensing
  teamLicense: {
    enabled: { type: Boolean, default: false },
    maxSeats: { type: Number }, // Maximum team members per license
    pricePerSeat: { type: Number }, // Price per team member
    teamIds: [mongoose.Schema.Types.ObjectId] // Teams that have license
  },
  
  // Enrollment tracking
  enrollmentCount: { type: Number, default: 0 },
  certificateCount: { type: Number, default: 0 },
  
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