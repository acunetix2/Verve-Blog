import express from "express";
import EmailDigestSubscription from "../models/EmailDigestSubscription.js";
import Post from "../models/Post.js";
import User from "../models/User.js";
import { authMiddleware as auth } from "../middleware/auth.js";
import { sendEmail } from "../utils/sendEmail.js";

const router = express.Router();

// Subscribe to email digest
router.post("/subscribe", auth, async (req, res) => {
  try {
    const { frequency, categories } = req.body;
    
    let subscription = await EmailDigestSubscription.findOne({ user: req.user.id });
    
    if (subscription) {
      subscription.frequency = frequency || subscription.frequency;
      subscription.categories = categories || subscription.categories;
      subscription.subscribed = true;
      await subscription.save();
    } else {
      subscription = new EmailDigestSubscription({
        user: req.user.id,
        email: req.user.email,
        frequency: frequency || "weekly",
        categories: categories || [],
        subscribed: true,
      });
      await subscription.save();
    }
    
    res.json({
      message: "Subscribed to email digest",
      subscription,
    });
  } catch (error) {
    res.status(500).json({ message: "Error subscribing to digest", error });
  }
});

// Get user's subscription
router.get("/preferences", auth, async (req, res) => {
  try {
    const subscription = await EmailDigestSubscription.findOne({ user: req.user.id });
    
    if (!subscription) {
      return res.json({
        subscribed: false,
        frequency: "weekly",
        categories: [],
      });
    }
    
    res.json(subscription);
  } catch (error) {
    res.status(500).json({ message: "Error fetching preferences", error });
  }
});

// Unsubscribe from digest
router.post("/unsubscribe", auth, async (req, res) => {
  try {
    await EmailDigestSubscription.findOneAndUpdate(
      { user: req.user.id },
      { subscribed: false }
    );
    
    res.json({ message: "Unsubscribed from digest" });
  } catch (error) {
    res.status(500).json({ message: "Error unsubscribing", error });
  }
});

// Generate and send digest (run as cron job)
router.post("/send-weekly", async (req, res) => {
  try {
    // Get all active subscribers
    const subscribers = await EmailDigestSubscription.find({
      subscribed: true,
      frequency: "weekly",
    }).populate("user");
    
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    // Get trending posts from last week
    const trendingPosts = await Post.find({
      publishedAt: { $gte: lastWeek },
      status: "published",
    })
      .sort({ views: -1, likes: -1 })
      .limit(10)
      .select("title slug description views likes createdAt");
    
    if (trendingPosts.length === 0) {
      return res.json({ message: "No posts to digest" });
    }
    
    // Send emails to each subscriber
    let successCount = 0;
    for (const subscription of subscribers) {
      const user = subscription.user;
      
      const emailContent = generateDigestEmail(
        user.name,
        trendingPosts,
        subscription.frequency
      );
      
      try {
        await sendEmail({
          to: user.email,
          subject: `Your Weekly Digest - Top Posts of the Week`,
          html: emailContent,
        });
        successCount++;
        
        // Update last digest sent
        subscription.lastDigestSent = new Date();
        await subscription.save();
      } catch (emailError) {
        console.error(`Failed to send to ${user.email}:`, emailError);
      }
    }
    
    res.json({
      message: `Digest sent to ${successCount} subscribers`,
      count: successCount,
    });
  } catch (error) {
    res.status(500).json({ message: "Error sending digest", error });
  }
});

// Generate email content for digest
function generateDigestEmail(userName, posts, frequency) {
  const postsHtml = posts
    .map((post, idx) => `
      <tr style="border-bottom: 1px solid #e0e0e0;">
        <td style="padding: 16px; color: #666;">${idx + 1}</td>
        <td style="padding: 16px;">
          <a href="${process.env.FRONTEND_URL}/blog/${post.slug}" style="color: #2563eb; text-decoration: none; font-weight: 600;">
            ${post.title}
          </a>
          <p style="color: #666; font-size: 14px; margin: 8px 0 0 0;">
            ${post.description ? post.description.substring(0, 100) + "..." : ""}
          </p>
        </td>
        <td style="padding: 16px; text-align: center; color: #999;">
          👁️ ${post.views} • ❤️ ${post.likes}
        </td>
      </tr>
    `)
    .join("");
  
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Weekly Digest</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px; }
          table { width: 100%; border-collapse: collapse; }
          .footer { margin-top: 20px; padding-top: 20px; border-top: 1px solid #e0e0e0; font-size: 12px; color: #999; text-align: center; }
          .cta-button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 28px;">Your Weekly Digest</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Top trending posts from this week</p>
          </div>
          <div class="content">
            <p>Hi ${userName},</p>
            <p>Here are the most popular articles from the past week. Discover what your community is reading:</p>
            
            <table>
              <thead>
                <tr style="background: #f0f0f0; border-bottom: 2px solid #ddd;">
                  <th style="padding: 12px; text-align: left; color: #666; font-weight: 600; width: 40px;">#</th>
                  <th style="padding: 12px; text-align: left; color: #666; font-weight: 600;">Article</th>
                  <th style="padding: 12px; text-align: center; color: #666; font-weight: 600; width: 120px;">Engagement</th>
                </tr>
              </thead>
              <tbody>
                ${postsHtml}
              </tbody>
            </table>
            
            <center>
              <a href="${process.env.FRONTEND_URL}/blog" class="cta-button">View All Articles</a>
            </center>
            
            <div class="footer">
              <p>You're receiving this email because you subscribed to our weekly digest.</p>
              <p><a href="${process.env.FRONTEND_URL}/settings/digest" style="color: #2563eb;">Manage your preferences</a> | <a href="${process.env.FRONTEND_URL}/settings/digest?unsubscribe=true" style="color: #2563eb;">Unsubscribe</a></p>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

export default router;
