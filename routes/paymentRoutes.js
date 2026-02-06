/**
 * Author / Copyright: Iddy
 * All rights reserved.
 */
import express from "express";
import Stripe from "stripe";
import paypal from "@paypal/checkout-server-sdk";
import { authMiddleware } from "../middleware/auth.js";
import Payment from "../models/Payment.js";
import Subscription from "../models/Subscription.js";
import User from "../models/User.js";
import Course from "../models/Course.js";

const router = express.Router();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// PayPal environment
let environment = new paypal.core.SandboxEnvironment(
  process.env.PAYPAL_CLIENT_ID,
  process.env.PAYPAL_CLIENT_SECRET
);
let paypalClient = new paypal.core.PayPalHttpClient(environment);

// Plan pricing configuration
const PLAN_PRICING = {
  starter: { monthly: 999, yearly: 9999 }, // in cents
  pro: { monthly: 2999, yearly: 27999 },
  enterprise: { monthly: 0, yearly: 0 },
};

// ============================================================
// STRIPE ENDPOINTS
// ============================================================

// Create Stripe Checkout session
router.post("/stripe-session", authMiddleware, async (req, res) => {
  try {
    const { courseId, planId, billingCycle } = req.body;
    const userId = req.user.id;

    // Validate inputs
    if (!courseId || !planId || !billingCycle) {
      return res.status(400).json({ 
        success: false,
        error: "Missing courseId, planId, or billingCycle" 
      });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ 
        success: false,
        error: "Course not found" 
      });
    }

    // Get amount from course or plan
    let amount = course.pricing?.[`${billingCycle}Price`] || PLAN_PRICING[planId]?.[billingCycle];
    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid plan or billing cycle" 
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        error: "User not found" 
      });
    }

    const session = await stripe.checkout.sessions.create({
      customer_email: user.email,
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${course.title} - ${planId} plan`,
              description: course.description,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: billingCycle === "monthly" || billingCycle === "yearly" ? "subscription" : "payment",
      success_url: `${process.env.CLIENT_URL}/v/billing-success?session_id={CHECKOUT_SESSION_ID}&course_id=${courseId}`,
      cancel_url: `${process.env.CLIENT_URL}/v/billing-cancel`,
      metadata: {
        userId,
        courseId,
        planId,
        billingCycle
      }
    });

    res.json({ 
      success: true,
      sessionId: session.id,
      clientSecret: session.client_secret
    });
  } catch (error) {
    console.error("Stripe session error:", error);
    res.status(500).json({ 
      success: false,
      error: "Stripe session creation failed" 
    });
  }
});

// Verify Stripe payment session
router.post("/stripe-verify", authMiddleware, async (req, res) => {
  try {
    const { sessionId } = req.body;
    const userId = req.user.id;

    if (!sessionId) {
      return res.status(400).json({ 
        success: false,
        error: "Session ID required" 
      });
    }

    const session = await stripe.checkout.sessions.retrieve(sessionId);
    
    if (!session) {
      return res.status(404).json({ 
        success: false,
        error: "Session not found" 
      });
    }

    if (session.payment_status !== "paid") {
      return res.status(400).json({ 
        success: false,
        error: "Payment not completed" 
      });
    }

    const { courseId, planId, billingCycle } = session.metadata;

    // Create payment record
    const payment = new Payment({
      userId,
      courseId,
      paymentMethod: "stripe",
      amount: session.amount_total / 100, // Convert from cents
      currency: session.currency,
      stripeSessionId: sessionId,
      stripeChargeId: session.payment_intent,
      status: "completed",
      planType: planId,
      billingCycle
    });
    await payment.save();

    // Create subscription
    const course = await Course.findById(courseId);
    const now = new Date();
    let endDate = null;

    if (billingCycle === "monthly") {
      endDate = new Date(now.setMonth(now.getMonth() + 1));
    } else if (billingCycle === "yearly") {
      endDate = new Date(now.setFullYear(now.getFullYear() + 1));
    }

    const subscription = new Subscription({
      userId,
      courseId,
      subscriptionType: billingCycle,
      status: "active",
      startDate: new Date(),
      endDate,
      isRecurring: billingCycle !== "one-time",
      paymentId: payment._id
    });
    await subscription.save();

    // Update user enrollment
    const user = await User.findById(userId);
    if (!user.enrolledCourses) user.enrolledCourses = [];
    if (!user.enrolledCourses.find(e => e.courseId.toString() === courseId)) {
      user.enrolledCourses.push({
        courseId,
        enrolledAt: new Date(),
        lastAccessed: new Date()
      });
    }
    await user.save();

    res.json({
      success: true,
      message: "Payment verified and subscription created",
      payment,
      subscription
    });
  } catch (error) {
    console.error("Stripe verify error:", error);
    res.status(500).json({ 
      success: false,
      error: "Payment verification failed" 
    });
  }
});

// ============================================================
// PAYPAL ENDPOINTS
// ============================================================

// Create PayPal order
router.post("/paypal-order", authMiddleware, async (req, res) => {
  try {
    const { courseId, planId, billingCycle } = req.body;
    const userId = req.user.id;

    if (!courseId || !planId || !billingCycle) {
      return res.status(400).json({ 
        success: false,
        error: "Missing required fields" 
      });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ 
        success: false,
        error: "Course not found" 
      });
    }

    // Get amount from course or plan
    let amount = course.pricing?.[`${billingCycle}Price`] / 100 || PLAN_PRICING[planId]?.[billingCycle] / 100;
    if (!amount || amount <= 0) {
      return res.status(400).json({ 
        success: false,
        error: "Invalid plan or billing cycle" 
      });
    }

    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: "CAPTURE",
      purchase_units: [{
        amount: { 
          currency_code: "USD", 
          value: amount.toFixed(2)
        },
        description: course.title,
        custom_id: courseId
      }],
      metadata: {
        userId,
        courseId,
        planId,
        billingCycle
      }
    });

    const order = await paypalClient.execute(request);
    
    res.json({
      success: true,
      orderId: order.result.id,
      status: order.result.status
    });
  } catch (error) {
    console.error("PayPal order error:", error);
    res.status(500).json({ 
      success: false,
      error: "PayPal order creation failed" 
    });
  }
});

// Capture PayPal order
router.post("/paypal-capture", authMiddleware, async (req, res) => {
  try {
    const { orderId, courseId, planId, billingCycle } = req.body;
    const userId = req.user.id;

    if (!orderId) {
      return res.status(400).json({ 
        success: false,
        error: "Order ID required" 
      });
    }

    const request = new paypal.orders.OrdersCaptureRequest(orderId);
    request.requestBody({});

    const order = await paypalClient.execute(request);

    if (order.result.status !== "COMPLETED") {
      return res.status(400).json({ 
        success: false,
        error: "Payment not completed" 
      });
    }

    // Create payment record
    const paypalPayment = order.result.purchase_units[0].payments.captures[0];
    const payment = new Payment({
      userId,
      courseId,
      paymentMethod: "paypal",
      amount: paypalPayment.amount.value,
      currency: paypalPayment.amount.currency_code,
      paypalOrderId: orderId,
      paypalPaymentId: paypalPayment.id,
      status: "completed",
      planType: planId,
      billingCycle
    });
    await payment.save();

    // Create subscription
    const course = await Course.findById(courseId);
    const now = new Date();
    let endDate = null;

    if (billingCycle === "monthly") {
      endDate = new Date(now.setMonth(now.getMonth() + 1));
    } else if (billingCycle === "yearly") {
      endDate = new Date(now.setFullYear(now.getFullYear() + 1));
    }

    const subscription = new Subscription({
      userId,
      courseId,
      subscriptionType: billingCycle,
      status: "active",
      startDate: new Date(),
      endDate,
      isRecurring: billingCycle !== "one-time",
      paymentId: payment._id
    });
    await subscription.save();

    // Update user enrollment
    const user = await User.findById(userId);
    if (!user.enrolledCourses) user.enrolledCourses = [];
    if (!user.enrolledCourses.find(e => e.courseId.toString() === courseId)) {
      user.enrolledCourses.push({
        courseId,
        enrolledAt: new Date(),
        lastAccessed: new Date()
      });
    }
    await user.save();

    res.json({
      success: true,
      message: "Payment captured and subscription created",
      payment,
      subscription
    });
  } catch (error) {
    console.error("PayPal capture error:", error);
    res.status(500).json({ 
      success: false,
      error: "Payment capture failed" 
    });
  }
});

// Get payment history
router.get("/history", authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const payments = await Payment.find({ userId })
      .populate("courseId", "title")
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      payments
    });
  } catch (error) {
    console.error("Get payment history error:", error);
    res.status(500).json({ 
      success: false,
      error: "Failed to fetch payment history" 
    });
  }
});

export default router;
