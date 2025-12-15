import nodemailer from "nodemailer";

export const sendEmail = async ({ to, subject, html }) => {
 const MAIL_FROM = process.env.MAIL_FROM || "vervehubwriteups@gmail.com";
  const transporter = nodemailer.createTransport({
    host: "smtp.sendgrid.net",
    port: 587,          
    secure: false,      
    auth: {
      user: "apikey",   
      pass: process.env.SENDGRID_API_KEY, // your SendGrid API key
    },
  });

  await transporter.sendMail({
    from: MAIL_FROM, 
    to,
    subject,
    html,
  });
};
