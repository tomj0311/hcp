import nodemailer from 'nodemailer';

let transporter;
export function getTransporter(){
  if(!transporter){
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT)||587,
      secure: process.env.SMTP_SECURE === 'true',
      auth: process.env.SMTP_USER? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }: undefined
    });
  }
  return transporter;
}

export async function sendRegistrationEmail(to, role){
  if(!process.env.SMTP_HOST) return; // skip if not configured
  const transport = getTransporter();
  await transport.sendMail({
    from: process.env.EMAIL_FROM,
    to,
    subject: `Welcome to HealthCare Platform (${role})`,
    html: `<p>Thank you for registering as a <strong>${role}</strong> on the HealthCare Platform.</p>`
  });
}
