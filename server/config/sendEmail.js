import nodemailer from "nodemailer";

console.log("SMTP_USER:", process.env.SMTP_USER);
console.log("SENDER_EMAIL:", process.env.SENDER_EMAIL);

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false, // important for port 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendEmail = async ({ to, subject, body }) => {
  const fromAddress = process.env.SENDER_EMAIL 

  console.log("Using FROM:", fromAddress);

  const info = await transporter.sendMail({
    from: `"TicketShow" <${process.env.SENDER_EMAIL}>`, // force the verified sender
    to,
    subject,
    html: body,
  });

  console.log("Message sent:", info.messageId);
  return info;
};

export default sendEmail;
