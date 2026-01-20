import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import Subscription from '../models/Subscription.js';
import  Course from '../models/Course.js';
import User from '../models/User.js';
import  Payment from '../models/Payment.js';

const router = express.Router();

// Create subscription / Purchase course
router.post('/purchase', authMiddleware, async (req, res) => {
  try {
    const { courseId, subscriptionType } = req.body;
    const userId = req.user._id;

    if (!courseId || !subscriptionType) {
      return res.status(400).json({
        error: 'Missing courseId or subscriptionType'
      });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ error: 'Course not found' });
    }

    if (course.tier === 'free') {
      return res.status(400).json({
        error: 'This is a free course, no subscription needed'
      });
    }

    // Check if already subscribed
    const existingSubscription = await Subscription.findOne({
      userId,
      courseId,
      status: 'active'
    });

    if (existingSubscription) {
      return res.status(400).json({
        error: 'You already have an active subscription to this course'
      });
    }

    let subscriptionData = {
      userId,
      courseId,
      subscriptionType,
      status: 'active',
      startDate: new Date(),
      createdBy: userId
    };

    // Calculate end date based on subscription type
    const now = new Date();
    switch (subscriptionType) {
      case 'oneTime':
        subscriptionData.endDate = null; // Lifetime
        subscriptionData.isRecurring = false;
        break;
      case 'monthly':
        subscriptionData.endDate = new Date(now.setMonth(now.getMonth() + 1));
        subscriptionData.isRecurring = true;
        subscriptionData.renewalPeriod = 'monthly';
        break;
      case 'yearly':
        subscriptionData.endDate = new Date(now.setFullYear(now.getFullYear() + 1));
        subscriptionData.isRecurring = true;
        subscriptionData.renewalPeriod = 'yearly';
        break;
      case 'teamLicense':
        subscriptionData.endDate = new Date(now.setMonth(now.getMonth() + 1));
        subscriptionData.isRecurring = true;
        subscriptionData.renewalPeriod = 'monthly';
        subscriptionData.teamLicense = {
          isTeamLicense: true,
          teamId: course.teamLicense?.teamId,
          maxSeats: course.teamLicense?.maxSeats || 5,
          currentSeats: 1,
          teamMembers: [userId]
        };
        break;
      default:
        return res.status(400).json({ error: 'Invalid subscription type' });
    }

    // Calculate amount
    let amount = 0;
    const pricing = course.pricing || {};

    if (subscriptionType === 'oneTime' && pricing.oneTimeFee) {
      amount = pricing.oneTimeFee;
    } else if (subscriptionType === 'monthly' && pricing.monthlyPrice) {
      amount = pricing.monthlyPrice;
    } else if (subscriptionType === 'yearly' && pricing.yearlyPrice) {
      amount = pricing.yearlyPrice;
    } else if (subscriptionType === 'teamLicense' && course.teamLicense?.pricePerSeat) {
      amount = course.teamLicense.pricePerSeat;
    }

    // Create payment record (placeholder for actual payment processing)
    const payment = new Payment({
      userId,
      courseId,
      subscriptionType,
      amount,
      currency: pricing.currency || 'USD',
      status: 'pending',
      paymentMethod: 'card', // Will be set after Stripe/PayPal
      transactionId: `temp_${Date.now()}`, // Temporary
      createdAt: new Date()
    });

    await payment.save();

    // Create subscription
    subscriptionData.paymentId = payment._id;
    const subscription = new Subscription(subscriptionData);
    await subscription.save();

    // In production, redirect to Stripe/PayPal checkout
    // For now, return subscription details
    res.json({
      success: true,
      message: 'Subscription created. Ready for payment processing.',
      subscription: {
        id: subscription._id,
        courseId,
        subscriptionType,
        amount,
        currency: pricing.currency || 'USD',
        status: 'pending'
      },
      // TODO: Add payment gateway redirect URL
      // paymentUrl: `https://stripe.com/pay/${payment._id}`
    });
  } catch (error) {
    console.error('Purchase error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cancel subscription
router.post('/:subscriptionId/cancel', authMiddleware, async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const userId = req.user._id;

    const subscription = await Subscription.findOne({
      _id: subscriptionId,
      userId
    });

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    subscription.status = 'cancelled';
    subscription.endDate = new Date();
    await subscription.save();

    res.json({
      success: true,
      message: 'Subscription cancelled',
      subscription
    });
  } catch (error) {
    console.error('Cancellation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get user subscriptions
router.get('/user/my-subscriptions', authMiddleware, async (req, res) => {
  try {
    const userId = req.user._id;

    const subscriptions = await Subscription.find({ userId })
      .populate('courseId', 'title tier')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      subscriptions,
      total: subscriptions.length
    });
  } catch (error) {
    console.error('Fetch subscriptions error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Check subscription status
router.get('/:courseId/status', authMiddleware, async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;

    const subscription = await Subscription.findOne({
      userId,
      courseId,
      status: 'active'
    });

    res.json({
      subscribed: !!subscription,
      subscription: subscription || null
    });
  } catch (error) {
    console.error('Status check error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Add team member to team license
router.post('/:subscriptionId/team-member', authMiddleware, async (req, res) => {
  try {
    const { subscriptionId } = req.params;
    const { memberEmail } = req.body;
    const userId = req.user._id;

    const subscription = await Subscription.findOne({
      _id: subscriptionId,
      userId,
      'teamLicense.isTeamLicense': true
    });

    if (!subscription) {
      return res.status(404).json({
        error: 'Team license subscription not found'
      });
    }

    if (!subscription.teamLicense) {
      return res.status(400).json({
        error: 'This is not a team license subscription'
      });
    }

    if (subscription.teamLicense.currentSeats >= subscription.teamLicense.maxSeats) {
      return res.status(400).json({
        error: `Team is at maximum capacity (${subscription.teamLicense.maxSeats} seats)`
      });
    }

    const member = await User.findOne({ email: memberEmail });
    if (!member) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (!subscription.teamLicense.teamMembers.includes(member._id)) {
      subscription.teamLicense.teamMembers.push(member._id);
      subscription.teamLicense.currentSeats += 1;
      await subscription.save();
    }

    res.json({
      success: true,
      message: 'Team member added',
      subscription
    });
  } catch (error) {
    console.error('Add team member error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
