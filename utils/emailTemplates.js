export const passwordResetEmail = (resetUrl) => `
  <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <h2 style="color: #f97316;">Verve Hub Password Reset</h2>
    <p>You requested a password reset for your Verve Hub account.</p>
    <p>Click the button below to set a new password:</p>
    <a href="${resetUrl}" 
       style="display:inline-block; padding:10px 20px; background-color:#f97316; color:white; text-decoration:none; border-radius:5px;">
       Reset Password
    </a>
    <p>If the button doesn’t work, copy and paste this URL into your browser:</p>
    <p><a href="${resetUrl}">${resetUrl}</a></p>
    <p style="color: #888;">This link will expire in 1 hour. If you did not request this, please ignore this email.</p>
    
    <p style="margin-top: 20px;">Best regards,<br/>Verve Hub WriteUps Team</p>

    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />

    <p style="font-size: 12px; color: #999;">
      Security notice: If you did not request this password reset, please secure your account immediately by changing your password and enabling two-factor authentication.
    </p>
  </div>
`;
