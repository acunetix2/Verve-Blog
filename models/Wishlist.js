import mongoose from 'mongoose';

const WishlistSchema = new mongoose.Schema({
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
  
  // Wishlist metadata
  addedAt: {
    type: Date,
    default: Date.now
  },
  
  // User notes
  notes: {
    type: String,
    maxlength: 500
  },
  
  // Price tracking (for price drop notifications)
  savedPrice: Number,
  notifyOnPrice: {
    type: Boolean,
    default: false
  },
  priceDropThreshold: Number // Notify if price drops below this
}, { timestamps: true });

// Prevent duplicate wishlist entries
WishlistSchema.index({ userId: 1, courseId: 1 }, { unique: true });
WishlistSchema.index({ userId: 1, addedAt: -1 });

export default mongoose.model('Wishlist', WishlistSchema);
