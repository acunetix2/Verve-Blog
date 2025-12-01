import express from "express";
import Stripe from "stripe";
import paypal from "@paypal/checkout-server-sdk";

const router = express.Router();

// Initialize Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// PayPal environment
let environment = new paypal.core.SandboxEnvironment(
  process.env.PAYPAL_CLIENT_ID,
  process.env.PAYPAL_CLIENT_SECRET
);
let paypalClient = new paypal.core.PayPalHttpClient(environment);

// Stripe Checkout session
router.post("/stripe-session", async (req, res) => {
  try {
    const { planId, billingCycle } = req.body;

    const plans = {
      starter: { monthly: 6, yearly: 25 },
      pro: { monthly: 9, yearly: 30 },
      enterprise: { monthly: 0, yearly: 0 }, 
    };

    const amount = plans[planId]?.[billingCycle];
    if (!amount) return res.status(400).json({ error: "Invalid plan" });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `${planId} plan (${billingCycle})`,
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/billing-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/billing-cancel`,
    });

    res.json({ id: session.id });
  } catch (error) {
    console.error("Stripe session error:", error);
    res.status(500).json({ error: "Stripe session creation failed" });
  }
});

// PayPal order creation
router.post("/paypal-order", async (req, res) => {
  try {
    const { planId, billingCycle } = req.body;

    const plans = {
      starter: { monthly: "9.00", yearly: "86.00" },
      pro: { monthly: "29.00", yearly: "278.00" },
      enterprise: { monthly: "0", yearly: "0" },
    };

    const value = plans[planId]?.[billingCycle];
    if (!value) return res.status(400).json({ error: "Invalid plan" });

    const request = new paypal.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: "CAPTURE",
      purchase_units: [{ amount: { currency_code: "USD", value } }],
    });

    const order = await paypalClient.execute(request);
    res.json(order.result);
  } catch (error) {
    console.error("PayPal order error:", error);
    res.status(500).json({ error: "PayPal order creation failed" });
  }
});

export default router;
