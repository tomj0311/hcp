import nodemailer from 'nodemailer';

let transporter;

/**
 * Build (and cache) a Nodemailer transport. Supports generic SMTP or Gmail.
 * For Gmail, set SMTP_HOST=smtp.gmail.com, SMTP_PORT=465, SMTP_SECURE=true and provide an App Password.
 */
export function getTransporter(){
  if(!transporter){
    const isGmail = /gmail\.com$/i.test(process.env.SMTP_USER || '') || process.env.SMTP_HOST === 'smtp.gmail.com';
    // Prefer explicit host/port unless service shorthand is desired.
    const baseConfig = isGmail ? {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: Number(process.env.SMTP_PORT) || 465,
      secure: true
    }: {
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT)||587,
      secure: process.env.SMTP_SECURE === 'true'
    };
    transporter = nodemailer.createTransport({
      ...baseConfig,
      auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
    });
  }
  return transporter;
}

/**
 * Send a registration / verification email.
 * If verifyToken is provided, include code and link instructions.
 */
export async function sendRegistrationEmail(to, role, verifyToken){
  if(!process.env.SMTP_HOST) return; // skip if not configured
  try {
    const transport = getTransporter();
    const appUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const verificationLink = verifyToken ? `${appUrl}/verify?token=${encodeURIComponent(verifyToken)}` : null;
    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;font-size:15px;color:#222;">
        <h2 style="margin:0 0 16px;">Welcome${role? ' '+role.charAt(0).toUpperCase()+role.slice(1):''}!</h2>
        <p>Thank you for registering as a <strong>${role}</strong> on the ConsultFlow Platform.</p>
        ${verifyToken ? `
        <p>Please verify your email to activate your account.</p>
        <p style="background:#f5f5f5;padding:12px 16px;border-radius:6px;font-size:14px;letter-spacing:1px;text-align:center;"><strong>Verification Code:</strong><br><span style="font-size:18px;">${verifyToken}</span></p>
        <p>You can either paste the code above in the app's verification screen, or click the link below:</p>
        <p><a href="${verificationLink}" style="background:#1976d2;color:#fff;padding:10px 18px;border-radius:4px;text-decoration:none;display:inline-block;">Verify Email</a></p>
        <p style="font-size:12px;color:#666;">If the button does not work, open this URL manually:<br>${verificationLink}</p>
        `: ''}
        <p style="margin-top:32px;font-size:12px;color:#888;">If you did not request this, you can safely ignore the email.</p>
      </div>`;
    await transport.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to,
      subject: verifyToken ? 'Verify your email address' : `Welcome to ConsultFlow Platform (${role})`,
      html
    });
  } catch(err){
    console.error('[EMAIL] sendRegistrationEmail failed:', err.message);
  }
}

