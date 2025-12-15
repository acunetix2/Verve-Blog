import sgMail from "@sendgrid/mail";

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

export const sendEmail = async ({ to, subject, html }) => {
  const MAIL_FROM =
    process.env.MAIL_FROM || "no-reply@vervehub.com";

  await sgMail.send({
    to,
    from: MAIL_FROM,
    subject,
    html,
  });
};
