import mongoose from 'mongoose';

const EmailNotificationPreferenceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Email preferences
  preferences: {
    // Course-related
    courseEnrollmentConfirmation: { type: Boolean, default: true },
    courseStartReminder: { type: Boolean, default: true },
    lessonPublished: { type: Boolean, default: true },
    courseCompleted: { type: Boolean, default: true },
    
    // Engagement
    newCommentReply: { type: Boolean, default: true },
    courseReviewResponse: { type: Boolean, default: true },
    newMessage: { type: Boolean, default: true },
    
    // Achievements
    badgeEarned: { type: Boolean, default: true },
    certificateGenerated: { type: Boolean, default: true },
    
    // Promotions
    promotionalEmails: { type: Boolean, default: false },
    weeklyDigest: { type: Boolean, default: true },
    newsAndUpdates: { type: Boolean, default: true },
    
    // Learning reminders
    inactivityReminder: { type: Boolean, default: true },
    assignmentDueReminder: { type: Boolean, default: true }
  },
  
  // Email frequency
  emailFrequency: {
    type: String,
    enum: ['immediate', 'daily', 'weekly', 'never'],
    default: 'immediate'
  },
  
  // Unsubscribe
  unsubscribedAt: Date,
  unsubscribeReason: String,
  
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

export default mongoose.model('EmailNotificationPreference', EmailNotificationPreferenceSchema);
