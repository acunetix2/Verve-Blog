/**
 * Email Templates with Modern Styling
 * ====================================
 * Professional email templates using Resend API
 * Inspired by TryHackMe modern design patterns
 * Author / Copyright: Iddy
 */

// Color scheme (matching TryHackMe-inspired dark theme)
const BRAND_PRIMARY = "#0052cc";
const BRAND_SECONDARY = "#7c3aed";
const TEXT_DARK = "#1f2937";
const TEXT_LIGHT = "#6b7280";
const BG_LIGHT = "#f9fafb";
const ACCENT_ORANGE = "#f97316";
const ACCENT_GREEN = "#10b981";

const baseStyle = `
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', sans-serif;
line-height: 1.6;
color: ${TEXT_DARK};
`;

export const passwordResetEmail = (resetUrl) => `
  <div style="${baseStyle} max-width: 600px; margin: 0 auto; background: #ffffff;">
    <!-- Header with gradient -->
    <div style="background: linear-gradient(135deg, ${BRAND_PRIMARY} 0%, ${BRAND_SECONDARY} 100%); padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
      <h1 style="color: #fff; margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.5px;">🔐 Password Reset</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 8px 0 0 0; font-size: 14px;">Secure your Verve Hub account</p>
    </div>

    <!-- Main content -->
    <div style="padding: 40px 30px;">
      <p style="margin: 0 0 20px 0; font-size: 16px; color: ${TEXT_DARK};">Hi there,</p>

      <p style="margin: 0 0 24px 0; font-size: 15px; color: ${TEXT_LIGHT};">
        We received a request to reset your password. Click the button below to create a new password. This link expires in <strong>1 hour</strong>.
      </p>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${resetUrl}" 
           style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, ${ACCENT_ORANGE} 0%, ${ACCENT_GREEN} 100%); color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 15px rgba(249, 115, 22, 0.3); transition: transform 0.2s;">
          Reset Password
        </a>
      </div>

      <!-- Security info box -->
      <div style="background: ${BG_LIGHT}; border-left: 4px solid ${ACCENT_ORANGE}; padding: 16px 20px; border-radius: 6px; margin: 24px 0;">
        <p style="margin: 0; font-size: 13px; color: ${TEXT_DARK};">
          <strong>🔒 Security Tip:</strong> Never share this link with anyone. We'll never ask for your password via email.
        </p>
      </div>

      <!-- Fallback link -->
      <p style="margin: 24px 0 0 0; font-size: 13px; color: ${TEXT_LIGHT}; text-align: center;">
        Or copy this link:<br>
        <span style="word-break: break-all; color: ${BRAND_PRIMARY};">${resetUrl}</span>
      </p>
    </div>

    <!-- Footer -->
    <div style="background: ${BG_LIGHT}; padding: 24px 30px; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; font-size: 13px; color: ${TEXT_LIGHT};">
        Questions? Contact our support team at <strong>support@vervehub.com</strong>
      </p>
      <p style="margin: 12px 0 0 0; font-size: 12px; color: #9ca3af;">
        © 2024 Verve Hub Academy. All rights reserved.
      </p>
    </div>
  </div>
`;

// Plain-text fallback
export const passwordResetText = (resetUrl) => `
🔐 PASSWORD RESET - Verve Hub Academy
=====================================

Hi there,

We received a request to reset your password. Use the link below to create a new password. This link expires in 1 hour.

${resetUrl}

🔒 SECURITY TIP:
Never share this link with anyone. We'll never ask for your password via email.

Questions? Contact support@vervehub.com

© 2024 Verve Hub Academy
`;

/**
 * Course Completion Email - Modern design
 */
export const courseCompletionEmail = (userName, courseName, certificateNumber, certificateUrl) => `
  <div style="${baseStyle} max-width: 600px; margin: 0 auto; background: #ffffff;">
    <!-- Celebratory Header -->
    <div style="background: linear-gradient(135deg, ${ACCENT_GREEN} 0%, #0ea5e9 100%); padding: 50px 20px; text-align: center; border-radius: 12px 12px 0 0;">
      <div style="font-size: 48px; margin-bottom: 16px;">🎉</div>
      <h1 style="color: #fff; margin: 0; font-size: 28px; font-weight: 700;">Course Completed!</h1>
      <p style="color: rgba(255,255,255,0.95); margin: 12px 0 0 0; font-size: 16px;">You've earned your certificate</p>
    </div>

    <!-- Main content -->
    <div style="padding: 40px 30px;">
      <p style="margin: 0 0 8px 0; font-size: 16px; color: ${TEXT_DARK};">
        Congratulations, <strong>${userName}</strong>! 🏆
      </p>

      <p style="margin: 0 0 24px 0; font-size: 15px; color: ${TEXT_LIGHT};">
        You've successfully completed the <strong>${courseName}</strong> course. Your dedication and hard work have paid off!
      </p>

      <!-- Certificate Box -->
      <div style="background: linear-gradient(135deg, rgba(102,126,234,0.05) 0%, rgba(118,75,162,0.05) 100%); border: 2px solid ${BRAND_PRIMARY}; border-radius: 8px; padding: 24px; margin: 28px 0; text-align: center;">
        <p style="margin: 0 0 8px 0; font-size: 13px; color: ${TEXT_LIGHT}; text-transform: uppercase; letter-spacing: 1px;">Certificate of Completion</p>
        <p style="margin: 0; font-size: 20px; font-weight: 700; color: ${BRAND_PRIMARY}; font-family: monospace;">
          ${certificateNumber}
        </p>
      </div>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${certificateUrl}" 
           style="display: inline-block; padding: 14px 36px; background: ${ACCENT_GREEN}; color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; box-shadow: 0 4px 15px rgba(16, 185, 129, 0.3);">
          📥 Download Certificate
        </a>
      </div>

      <!-- Next Steps -->
      <div style="background: ${BG_LIGHT}; border-radius: 8px; padding: 24px; margin: 28px 0;">
        <h3 style="margin: 0 0 16px 0; color: ${TEXT_DARK}; font-size: 15px; font-weight: 600;">What's Next?</h3>
        <ul style="margin: 0; padding: 0; list-style: none; font-size: 14px;">
          <li style="margin: 0 0 8px 0; color: ${TEXT_LIGHT};">✓ Share your achievement on LinkedIn and social media</li>
          <li style="margin: 0 0 8px 0; color: ${TEXT_LIGHT};">✓ Explore advanced courses in our catalogue</li>
          <li style="margin: 0; color: ${TEXT_LIGHT};">✓ Join our community forums for peer learning</li>
        </ul>
      </div>

      <p style="margin: 24px 0 0 0; font-size: 14px; color: ${TEXT_LIGHT};">
        Thank you for choosing Verve Academy. Keep pushing your boundaries! 🚀
      </p>
    </div>

    <!-- Footer -->
    <div style="background: ${BG_LIGHT}; padding: 24px 30px; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb;">
      <p style="margin: 0; font-size: 13px; color: ${TEXT_LIGHT};">
        <strong>Iddy Chesire</strong> | CEO, Verve Hub Inc.
      </p>
      <p style="margin: 12px 0 0 0; font-size: 12px; color: #9ca3af;">
        © 2024 Verve Hub Academy | Cybersecurity Learning Platform
      </p>
    </div>
  </div>
`;

/**
 * Course Completion Email - Plain text
 */
export const courseCompletionText = (userName, courseName, certificateNumber, certificateUrl) => `
🎉 COURSE COMPLETED - Verve Hub Academy
====================================

Congratulations, ${userName}! 🏆

You've successfully completed the ${courseName} course. Your dedication and hard work have paid off!

CERTIFICATE OF COMPLETION
---
Certificate Number: ${certificateNumber}
---

📥 Download Your Certificate:
${certificateUrl}

WHAT'S NEXT?
✓ Share your achievement on LinkedIn and social media
✓ Explore advanced courses in our catalogue
✓ Join our community forums for peer learning

Thank you for choosing Verve Academy. Keep pushing your boundaries! 🚀

Best regards,

Iddy Chesire
CEO, Verve Hub Inc.

© 2024 Verve Hub Academy | Cybersecurity Learning Platform
`;

/**
 * Welcome Email - New user
 */
export const welcomeEmail = (userName) => `
  <div style="${baseStyle} max-width: 600px; margin: 0 auto; background: #ffffff;">
    <div style="background: linear-gradient(135deg, ${BRAND_PRIMARY} 0%, ${BRAND_SECONDARY} 100%); padding: 40px 20px; text-align: center; border-radius: 12px 12px 0 0;">
      <h1 style="color: #fff; margin: 0; font-size: 28px; font-weight: 700;">Welcome to Verve Academy! 👋</h1>
      <p style="color: rgba(255,255,255,0.9); margin: 12px 0 0 0; font-size: 15px;">Your cybersecurity learning journey starts now</p>
    </div>

    <div style="padding: 40px 30px;">
      <p style="margin: 0 0 20px 0; font-size: 16px;">Hi ${userName},</p>
      <p style="margin: 0 0 24px 0; font-size: 15px; color: ${TEXT_LIGHT};">
        Welcome aboard! We're excited to have you join our cybersecurity community. Whether you're just starting or looking to level up your skills, you're in the right place.
      </p>

      <div style="background: ${BG_LIGHT}; border-radius: 8px; padding: 24px; margin: 28px 0;">
        <h3 style="margin: 0 0 16px 0; color: ${TEXT_DARK}; font-size: 15px; font-weight: 600;">Get Started Quickly</h3>
        <ul style="margin: 0; padding: 0; list-style: none; font-size: 14px;">
          <li style="margin: 0 0 10px 0; color: ${TEXT_LIGHT};">1. Complete your profile to showcase your skills</li>
          <li style="margin: 0 0 10px 0; color: ${TEXT_LIGHT};">2. Browse our course catalogue</li>
          <li style="margin: 0; color: ${TEXT_LIGHT};">3. Start learning and earning certificates</li>
        </ul>
      </div>

      <p style="margin: 24px 0 0 0; font-size: 14px; color: ${TEXT_LIGHT};">
        Questions? Check out our FAQ or reach out to <strong>support@vervehub.com</strong>
      </p>
    </div>

    <div style="background: ${BG_LIGHT}; padding: 24px 30px; border-radius: 0 0 12px 12px; border-top: 1px solid #e5e7eb; text-align: center;">
      <p style="margin: 0; font-size: 12px; color: #9ca3af;">
        © 2024 Verve Hub Academy. Start your learning journey today!
      </p>
    </div>
  </div>
`;

