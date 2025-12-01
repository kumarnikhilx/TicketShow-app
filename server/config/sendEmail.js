import nodemailer from "nodemailer";

console.log("SMTP_USER:", process.env.SMTP_USER);
console.log("SENDER_EMAIL:", process.env.SENDER_EMAIL);

const transporter = nodemailer.createTransport({
  host: "smtp-relay.brevo.com",
  port: 587,
  secure: false, // for port 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendEmail = async ({ to, subject, body }) => {
  try {
    const fromAddress = process.env.SENDER_EMAIL;

    if (!fromAddress) {
      console.error("SENDER_EMAIL is not defined in environment");
      throw new Error("SENDER_EMAIL is missing");
    }

    if (!to) {
      console.error("No recipient email provided");
      throw new Error("Recipient email missing");
    }

    console.log("Sending email FROM:", fromAddress, "TO:", to);

    const info = await transporter.sendMail({
      from: `"TicketShow" <${fromAddress}>`, // must be verified sender
      to,
      subject,
      html: body,
    });

    console.log("Message sent:", info.messageId);
    return info;
  } catch (error) {
    console.error("Error sending email:", error);
    throw error;
  }
};

export default sendEmail;
