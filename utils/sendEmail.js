/**
 * Author / Copyright: Iddy
 * All rights reserved.
 */
import sgMail from "@sendgrid/mail";

// Validate and set SendGrid API key
let sendGridConfigured = false;

if (!process.env.SENDGRID_API_KEY) {
  console.error("❌ SENDGRID_API_KEY environment variable is not set!");
  console.error("   Set it in your .env file: SENDGRID_API_KEY=SG.your_actual_key_here");
  console.warn("⚠️  Email features will be disabled until SendGrid is configured.");
} else if (!process.env.SENDGRID_API_KEY.startsWith("SG.")) {
  console.error("❌ SENDGRID_API_KEY must start with 'SG.' - current value appears invalid");
  console.error("   Verify your SendGrid API key is correct in .env");
  console.warn("⚠️  Email features will be disabled until SendGrid key is corrected.");
} else {
  try {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    sendGridConfigured = true;
    console.log("✓ SendGrid API key configured successfully");
  } catch (error) {
    console.error("❌ Failed to configure SendGrid:", error.message);
    console.warn("⚠️  Email features will be disabled.");
  }
}

export const sendEmail = async ({ to, subject, html, text }) => {
  // Gracefully handle missing SendGrid configuration
  if (!sendGridConfigured || !process.env.SENDGRID_API_KEY) {
    console.warn("⚠️  SendGrid not configured - email would have been sent to:", to);
    console.warn("   Subject:", subject);
    // In production, you might want to:
    // - Log this to a database for manual follow-up
    // - Queue it for retry
    // - Return a warning status
    return {
      success: false,
      message: "Email service not configured",
      error: "SENDGRID_NOT_CONFIGURED"
    };
  }

  if (!process.env.SENDGRID_API_KEY.startsWith("SG.")) {
    throw new Error(
      "SendGrid API key is not properly configured. " +
      "Set SENDGRID_API_KEY in .env with a valid key starting with 'SG.'"
    );
  }

  const MAIL_FROM =
    process.env.MAIL_FROM || "vervehubwriteups@gmail.com";

  const mailOptions = {
    to,
    from: MAIL_FROM,
    subject,
    html,
  };

  // Add text version if provided (fallback for plain text email clients)
  if (text) {
    mailOptions.text = text;
  }

  try {
    await sgMail.send(mailOptions);
    return { success: true, message: "Email sent successfully" };
  } catch (error) {
    console.error("SendGrid email send error:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};
