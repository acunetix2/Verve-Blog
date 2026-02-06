import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import EmailNotificationPreference from '../models/EmailNotificationPreference.js';
import User from '../models/User.js';
import { sendEmail } from '../utils/sendEmail.js';

const router = express.Router();

// ============================================================
// EMAIL NOTIFICATION PREFERENCES
// ============================================================

// Get user's email preferences
router.get('/preferences', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    let preferences = await EmailNotificationPreference.findOne({ userId });

    // Create default preferences if not found
    if (!preferences) {
      preferences = new EmailNotificationPreference({ userId });
      await preferences.save();
    }

    res.json({
      success: true,
      preferences
    });
  } catch (error) {
    console.error('Get email preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch email preferences'
    });
  }
});

// Update email preferences
router.put('/preferences', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { preferences, emailFrequency } = req.body;

    let emailPrefs = await EmailNotificationPreference.findOne({ userId });

    if (!emailPrefs) {
      emailPrefs = new EmailNotificationPreference({ userId });
    }

    if (preferences) {
      emailPrefs.preferences = { ...emailPrefs.preferences, ...preferences };
    }

    if (emailFrequency) {
      emailPrefs.emailFrequency = emailFrequency;
    }

    await emailPrefs.save();

    res.json({
      success: true,
      message: 'Email preferences updated',
      preferences: emailPrefs
    });
  } catch (error) {
    console.error('Update email preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update email preferences'
    });
  }
});

// Unsubscribe from all emails
router.post('/unsubscribe', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { reason = '' } = req.body;

    let preferences = await EmailNotificationPreference.findOne({ userId });

    if (!preferences) {
      preferences = new EmailNotificationPreference({ userId });
    }

    // Mark all preferences as false
    Object.keys(preferences.preferences).forEach(key => {
      preferences.preferences[key] = false;
    });

    preferences.unsubscribedAt = new Date();
    preferences.unsubscribeReason = reason;
    await preferences.save();

    res.json({
      success: true,
      message: 'You have been unsubscribed from all emails'
    });
  } catch (error) {
    console.error('Unsubscribe error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unsubscribe'
    });
  }
});

// Resubscribe to emails
router.post('/resubscribe', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    let preferences = await EmailNotificationPreference.findOne({ userId });

    if (!preferences) {
      preferences = new EmailNotificationPreference({ userId });
    }

    // Restore default preferences
    preferences.preferences = {
      courseEnrollmentConfirmation: true,
      courseStartReminder: true,
      lessonPublished: true,
      courseCompleted: true,
      newCommentReply: true,
      courseReviewResponse: true,
      newMessage: true,
      badgeEarned: true,
      certificateGenerated: true,
      promotionalEmails: false,
      weeklyDigest: true,
      newsAndUpdates: true,
      inactivityReminder: true,
      assignmentDueReminder: true
    };

    preferences.unsubscribedAt = null;
    preferences.unsubscribeReason = null;
    await preferences.save();

    res.json({
      success: true,
      message: 'You have been resubscribed'
    });
  } catch (error) {
    console.error('Resubscribe error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to resubscribe'
    });
  }
});

// ============================================================
// TEST EMAIL ENDPOINT
// ============================================================

router.post('/test', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user || !user.email) {
      return res.status(400).json({
        success: false,
        message: 'User email not found'
      });
    }

    const testEmailContent = `
      <h2>Test Email - Verve Hub Academy</h2>
      <p>Hello ${user.name},</p>
      <p>This is a test email to verify that your email settings are working correctly.</p>
      <p>If you received this email, your email notifications are properly configured.</p>
      <hr>
      <p>Best regards,<br>Verve Hub Academy Team</p>
    `;

    await sendEmail(
      user.email,
      'Test Email - Verve Hub Academy',
      testEmailContent
    );

    res.json({
      success: true,
      message: 'Test email sent successfully'
    });
  } catch (error) {
    console.error('Send test email error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send test email',
      error: error.message
    });
  }
});

export default router;
