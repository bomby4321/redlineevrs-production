import nodemailer from "nodemailer";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();

  const { to, fullName, pickupDate, pickupTime, tripDuration, cost } = req.body;

  // Format tripDuration in hours/minutes
  const hours = Math.floor(tripDuration / 60);
  const minutes = tripDuration % 60;
  const durationStr = `${hours > 0 ? hours + "h " : ""}${minutes}m`;

  // Create transporter (SMTP)
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: true,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });

  const html = `
    <p>Hi ${fullName},</p>
    <p>Your trip has been confirmed!</p>
    <ul>
      <li><strong>Date:</strong> ${pickupDate}</li>
      <li><strong>Time:</strong> ${pickupTime}</li>
      <li><strong>Trip Duration:</strong> ${durationStr}</li>
      <li><strong>Estimated Cost:</strong> $${cost}</li>
    </ul>
    <p>Thank you for using our service!</p>
  `;

  try {
    await transporter.sendMail({
      from: `"My Service" <${process.env.SMTP_USER}>`,
      to,
      subject: "Trip Reservation Confirmation",
      html
    });
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("Email error:", err);
    res.status(500).json({ error: "Failed to send email" });
  }
}
