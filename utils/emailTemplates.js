export const passwordResetEmail = (resetUrl) => `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: auto;">
    
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
