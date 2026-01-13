/**
 * Author / Copyright: Iddy
 * All rights reserved.
 */
export const passwordResetEmail = (resetUrl) => `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto;">
    
    <div style="text-align: center; margin-bottom: 30px;">
      <img src="https://vervehub.com/logo.png" alt="Verve Hub Academy" style="max-width: 200px; height: auto;" />
    </div>
    
    <h2 style="color: #f97316;">Verve Hub Password Reset</h2>
    
    <p>Hello,</p>
    
    <p>You recently requested to reset your Verve Hub account password. Click the button below to reset it:</p>
    
    <p style="text-align:center;">
      <a href="${resetUrl}" 
         style="color: #fff; background-color: #f97316; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
        Reset Password
      </a>
    </p>

    <p>If the button above does not work, copy and paste this URL into your browser:</p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>
    
    <p style="color: #888;">This link will expire in 1 hour. If you did not request this, simply ignore this email.</p>
    
    <p style="margin-top: 20px;">Best regards,<br/>Verve Hub WriteUps Team</p>

    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />

    <p style="font-size: 12px; color: #666;">
      Verve Hub WriteUps | 123 Main Street | Nairobi, Kenya
    </p>

    <p style="font-size: 12px; color: #999;">
      Security notice: If you did not request this password reset, secure your account immediately by changing your password and enabling two-factor authentication.
    </p>
  </div>
`;

// Plain-text fallback for better deliverability
export const passwordResetText = (resetUrl) => `
Verve Hub Password Reset

You recently requested to reset your Verve Hub account password.

Reset your password using this link: ${resetUrl}

This link will expire in 1 hour. If you did not request this, ignore this email.

Best regards,
Verve Hub WriteUps Team

Verve Hub WriteUps | 123 Main Street | Nairobi, Kenya

Security notice: If you did not request this password reset, secure your account immediately by changing your password and enabling two-factor authentication.
`;

// Course Completion Email
export const courseCompletionEmail = (userName, courseName, certificateNumber, certificateUrl) => `
  <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.8; color: #333; max-width: 600px; margin: auto; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 0; border-radius: 8px; overflow: hidden;">
    
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
      <img src="https://vervehub.com/logo.png" alt="Verve Hub Academy" style="max-width: 180px; height: auto; margin-bottom: 15px;" />
      <h1 style="color: #fff; margin: 0 0 5px 0; font-size: 28px; font-weight: 700;">Verve Academy</h1>
      <h2 style="color: #fff; margin: 0; font-size: 24px; font-weight: 700;">🎉 Congratulations!</h2>
      <p style="color: rgba(255,255,255,0.9); margin: 10px 0 0 0; font-size: 16px;">You've Successfully Completed a Course</p>
    </div>

    <!-- Body -->
    <div style="padding: 40px 30px; background: #fff;">
      <p style="font-size: 16px; margin-top: 0;">Dear <strong>${userName}</strong>,</p>
      
      <p style="font-size: 15px; color: #555;">We're thrilled to inform you that you have successfully completed the course:</p>
      
      <div style="background: linear-gradient(135deg, rgba(102,126,234,0.1) 0%, rgba(118,75,162,0.1) 100%); border-left: 4px solid #667eea; padding: 20px; margin: 25px 0; border-radius: 4px;">
        <h3 style="margin: 0 0 10px 0; color: #667eea; font-size: 18px;">${courseName}</h3>
        <p style="margin: 8px 0; color: #666; font-size: 14px;">
          <strong>Certificate Number:</strong> <span style="font-family: monospace; color: #764ba2;">${certificateNumber}</span>
        </p>
      </div>

      <p style="font-size: 15px; color: #555; margin-top: 25px;">Your certificate of completion has been generated and is ready for download. You can view and download your certificate using the button below:</p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${certificateUrl}" 
           style="color: #fff; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600; font-size: 15px; box-shadow: 0 4px 15px rgba(102,126,234,0.4);">
          📜 View My Certificate
        </a>
      </div>

      <div style="background: #f8f9fa; padding: 20px; border-radius: 6px; margin: 25px 0;">
        <h4 style="color: #667eea; margin-top: 0; font-size: 15px;">What's Next?</h4>
        <ul style="color: #555; font-size: 14px; padding-left: 20px; margin: 10px 0;">
          <li>Share your achievement with your network</li>
          <li>Explore more courses to expand your knowledge</li>
          <li>Download your certificate for your records</li>
        </ul>
      </div>

      <p style="font-size: 15px; color: #555; margin-top: 25px;">Thank you for choosing Verve Academy for your cybersecurity learning journey. Keep up the excellent work!</p>

      <div style="margin-top: 35px; padding-top: 20px; border-top: 2px solid #eee;">
        <p style="margin: 5px 0; font-size: 14px; color: #333;">Best regards,</p>
        <p style="margin: 15px 0 0 0; font-size: 15px; font-weight: 600; color: #333;">Iddy Chesire</p>
        <p style="margin: 3px 0; font-size: 13px; color: #667eea; font-weight: 600;">CEO, Verve Hub Inc.</p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background: #f5f5f5; padding: 20px 30px; text-align: center; border-top: 1px solid #eee;">
      <p style="margin: 0; font-size: 12px; color: #999;">
        Verve Academy | Cybersecurity Learning Platform
      </p>
      <p style="margin: 5px 0 0 0; font-size: 12px; color: #ccc;">
        This is an automated message, please do not reply to this email.
      </p>
    </div>
  </div>
`;

// Plain-text version of course completion email
export const courseCompletionText = (userName, courseName, certificateNumber, certificateUrl) => `
Verve Academy
Congratulations! You've Successfully Completed a Course

Dear ${userName},

We're thrilled to inform you that you have successfully completed the course: ${courseName}

Certificate Number: ${certificateNumber}

Your certificate of completion has been generated and is ready for download.

View your certificate here: ${certificateUrl}

What's Next?
- Share your achievement with your network
- Explore more courses to expand your knowledge
- Download your certificate for your records

Thank you for choosing Verve Academy for your cybersecurity learning journey. Keep up the excellent work!

Best regards,

Iddy Chesire
CEO, Verve Hub Inc.

---
Verve Academy | Cybersecurity Learning Platform
This is an automated message, please do not reply to this email.
`;
