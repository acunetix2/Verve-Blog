/**
 * Email Sender using Resend API
 * ================================
 * Replaces SendGrid for better deliverability and pricing
 * Author / Copyright: Iddy
 */
import { Resend } from 'resend';

// Initialize Resend client
let resendClient = null;
let resendConfigured = false;

if (!process.env.RESEND_API_KEY) {
  console.error("❌ RESEND_API_KEY environment variable is not set!");
  console.error("   Set it in your .env file: RESEND_API_KEY=re_xxxxxxxxxxxx");
  console.warn("⚠️  Email features will be disabled until Resend is configured.");
} else if (!process.env.RESEND_API_KEY.startsWith("re_")) {
  console.error("❌ RESEND_API_KEY must start with 're_' - current value appears invalid");
  console.error("   Verify your Resend API key is correct in .env");
  console.warn("⚠️  Email features will be disabled until Resend key is corrected.");
} else {
  try {
    resendClient = new Resend(process.env.RESEND_API_KEY);
    resendConfigured = true;
    console.log("✓ Resend API key configured successfully");
  } catch (error) {
    console.error("❌ Failed to configure Resend:", error.message);
    console.warn("⚠️  Email features will be disabled.");
  }
}

const MAIL_FROM = process.env.MAIL_FROM || "noreply@vervehub.com";

/**
 * Send email using Resend API
 * @param {Object} options - Email options
 * @param {string} options.to - Recipient email
 * @param {string} options.subject - Email subject
 * @param {string} options.html - HTML content
 * @param {string} [options.text] - Plain text content (optional)
 * @param {string} [options.replyTo] - Reply-to email (optional)
 * @returns {Promise<Object>} - Result object with success status
 */
export const sendEmail = async ({ to, subject, html, text, replyTo }) => {
  // Gracefully handle missing Resend configuration
  if (!resendConfigured || !resendClient) {
    console.warn("⚠️  Resend not configured - email would have been sent to:", to);
    console.warn("   Subject:", subject);
    return {
      success: false,
      message: "Email service not configured",
      error: "RESEND_NOT_CONFIGURED"
    };
  }

  if (!process.env.RESEND_API_KEY || !process.env.RESEND_API_KEY.startsWith("re_")) {
    throw new Error(
      "Resend API key is not properly configured. " +
      "Set RESEND_API_KEY in .env with a valid key starting with 're_'"
    );
  }

  try {
    const emailData = {
      from: MAIL_FROM,
      to,
      subject,
      html
    };

    // Add optional fields if provided
    if (text) {
      emailData.text = text;
    }

    if (replyTo) {
      emailData.replyTo = replyTo;
    }

    const result = await resendClient.emails.send(emailData);

    if (result.error) {
      console.error("Resend email error:", result.error);
      throw new Error(`Failed to send email: ${result.error.message}`);
    }

    console.log(`Email sent successfully to ${to} (ID: ${result.data?.id})`);
    return {
      success: true,
      message: "Email sent successfully",
      id: result.data?.id
    };
  } catch (error) {
    console.error("Resend email send error:", error);
    throw new Error(`Failed to send email: ${error.message}`);
  }
};

/**
 * Send bulk emails using Resend API (useful for digests/newsletters)
 * @param {Array} emails - Array of email objects with {to, subject, html}
 * @returns {Promise<Array>} - Array of results
 */
export const sendBulkEmails = async (emails) => {
  if (!resendConfigured || !resendClient) {
    console.warn("⚠️  Resend not configured - bulk emails cannot be sent");
    return [];
  }

  const results = [];
  
  for (const email of emails) {
    try {
      const result = await sendEmail(email);
      results.push(result);
    } catch (error) {
      console.error(`Failed to send email to ${email.to}:`, error.message);
      results.push({
        success: false,
        to: email.to,
        error: error.message
      });
    }
  }

  return results;
};

export default sendEmail;
