import mongoose from 'mongoose';

const certificateSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    courseTitle: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    completionDate: {
      type: Date,
      default: Date.now,
    },
    certificateNumber: {
      type: String,
      unique: true,
      required: true,
    },
    badgeImage: {
      type: String, // URL to badge image
      default: null,
    },
    badgeB2FileId: {
      type: String, // B2 file ID for badge
      default: null,
    },
    certificateUrl: {
      type: String, // HTML/PDF certificate URL
      default: null,
    },
    certificateB2FileId: {
      type: String, // B2 file ID for certificate
      default: null,
    },
    quizScores: {
      type: Map,
      of: Number, // lessonId -> score mapping
      default: new Map(),
    },
    totalQuizScore: {
      type: Number,
      default: 0,
    },
    issuedBy: {
      organization: {
        type: String,
        default: 'Verve Academy',
      },
      signature: {
        type: String,
        default: 'Verve Academy Team',
      },
    },
    isDownloaded: {
      type: Boolean,
      default: false,
    },
    downloadedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

// Generate unique certificate number before saving
certificateSchema.pre('save', async function (next) {
  if (!this.certificateNumber) {
    const timestamp = Date.now().toString().slice(-8);
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.certificateNumber = `VA-${timestamp}-${random}`;
  }
  next();
});

export default mongoose.model('Certificate', certificateSchema);


