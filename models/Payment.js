import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true,
    index: true
  },
  subscriptionType: {
    type: String,
    enum: ['oneTime', 'monthly', 'yearly', 'teamLicense'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'USD'
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded', 'expired'],
    default: 'pending',
    index: true
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'paypal', 'stripe', 'bank_transfer', 'other'],
    required: true
  },
  transactionId: {
    type: String,
    unique: true,
    sparse: true
  },
  stripePaymentIntentId: {
    type: String,
    sparse: true
  },
  paypalOrderId: {
    type: String,
    sparse: true
  },
  receiptUrl: String,
  invoiceUrl: String,
  lastFourDigits: String,
  failureReason: String,
  metadata: {
    couponCode: String,
    discount: Number,
    taxAmount: Number,
    finalAmount: Number
  },
  createdAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date,
  refundedAt: Date
});

// Index for finding payments by user and course
paymentSchema.index({ userId: 1, courseId: 1 });
paymentSchema.index({ status: 1, createdAt: -1 });

// Pre-find hook for query optimization
paymentSchema.pre('find', function() {
  if (this.getOptions().lean !== false) {
    this.select('+stripePaymentIntentId +paypalOrderId');
  }
});

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
