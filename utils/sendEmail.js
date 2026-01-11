/**
 * Author / Copyright: Iddy
 * All rights reserved.
 */
import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const sendEmail = async ({ to, subject, html, text }) => {
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

  await sgMail.send(mailOptions);
};
