import mongoose from 'mongoose';

const SubscriptionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true, index: true },
  
  // Subscription Details
  subscriptionType: { 
    type: String, 
    enum: ['oneTime', 'monthly', 'yearly', 'lifetime', 'teamLicense'], 
    required: true 
  },
  
  // Dates
  startDate: { type: Date, required: true },
  endDate: { type: Date }, // Null for lifetime
  renewalDate: { type: Date }, // Next renewal date for subscriptions
  
  // Status
  status: { 
    type: String, 
    enum: ['active', 'expired', 'cancelled', 'suspended'], 
    default: 'active' 
  },
  
  // Payment Info
  transactionId: { type: String }, // Payment gateway transaction ID
  amountPaid: { type: Number },
  currency: { type: String, default: 'USD' },
  paymentMethod: { type: String }, // 'stripe', 'paypal', 'manual'
  
  // Team License
  teamLicense: {
    isTeamLicense: { type: Boolean, default: false },
    teamId: mongoose.Schema.Types.ObjectId,
    teamName: String,
    maxSeats: Number,
    currentSeats: { type: Number, default: 1 },
    teamMembers: [mongoose.Schema.Types.ObjectId] // User IDs in team
  },
  
  // Auto Renewal
  autoRenew: { type: Boolean, default: true },
  lastRenewalDate: { type: Date },
  failedRenewalAttempts: { type: Number, default: 0 },
  
  // Trial
  isTrial: { type: Boolean, default: false },
  trialDaysRemaining: { type: Number },
  
  // Notes
  notes: String,
  
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now }
});

// Index for quick lookups
SubscriptionSchema.index({ userId: 1, courseId: 1 });
SubscriptionSchema.index({ status: 1, endDate: 1 });

// Auto-expire subscriptions
SubscriptionSchema.pre('find', async function() {
  const now = new Date();
  await this.model.updateMany(
    { 
      endDate: { $lt: now }, 
      status: 'active'
    },
    { status: 'expired' }
  );
});

export default mongoose.model('Subscription', SubscriptionSchema);
