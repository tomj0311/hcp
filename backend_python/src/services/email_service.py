import os
import logging
import aiosmtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Optional
from urllib.parse import quote_plus

logger = logging.getLogger(__name__)

# Email configuration
SMTP_HOST = os.getenv('SMTP_HOST')
SMTP_PORT = int(os.getenv('SMTP_PORT', 587))
SMTP_USER = os.getenv('SMTP_USER')
SMTP_PASS = os.getenv('SMTP_PASS')
SMTP_SECURE = os.getenv('SMTP_SECURE', 'false').lower() == 'true'

# Client URL for verification links
CLIENT_URL = os.getenv('CLIENT_URL', 'http://localhost:5173')


async def send_email(to: str, subject: str, html_content: str, text_content: Optional[str] = None):
    """Send an email using SMTP"""
    if not SMTP_HOST:
        logger.info("SMTP not configured, skipping email send")
        return
    
    try:
        # Create message
        message = MIMEMultipart('alternative')
        message['Subject'] = subject
        message['From'] = SMTP_USER
        message['To'] = to
        
        # Add text part if provided
        if text_content:
            text_part = MIMEText(text_content, 'plain')
            message.attach(text_part)
        
        # Add HTML part
        html_part = MIMEText(html_content, 'html')
        message.attach(html_part)
        
        # Configure SMTP
        smtp_kwargs = {
            'hostname': SMTP_HOST,
            'port': SMTP_PORT,
        }
        
        # Gmail specific configuration
        is_gmail = 'gmail.com' in (SMTP_USER or '') or SMTP_HOST == 'smtp.gmail.com'
        if is_gmail:
            smtp_kwargs.update({
                'port': int(os.getenv('SMTP_PORT', 465)),
                'use_tls': True
            })
        else:
            smtp_kwargs['use_tls'] = SMTP_SECURE
        
        # Add authentication if configured
        if SMTP_USER and SMTP_PASS:
            smtp_kwargs.update({
                'username': SMTP_USER,
                'password': SMTP_PASS
            })
        
        # Send email
        await aiosmtplib.send(message, **smtp_kwargs)
        logger.info(f"Email sent successfully to {to}")
        
    except Exception as e:
        logger.error(f"Failed to send email to {to}: {e}")
        raise


async def send_registration_email(to: str, role: str, verify_token: Optional[str] = None):
    """Send a registration/verification email"""
    if not SMTP_HOST:
        return  # Skip if not configured
    
    try:
        verification_link = None
        if verify_token:
            verification_link = f"{CLIENT_URL}/verify?token={quote_plus(verify_token)}"
        
        # Create HTML content
        html_content = f"""
        <div style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;font-size:15px;color:#222;">
            <h2 style="margin:0 0 16px;">Welcome{' ' + role.capitalize() if role else ''}!</h2>
            <p>Thank you for registering as a <strong>{role}</strong> on the ConsultFlow Platform.</p>
        """
        
        if verify_token:
            html_content += f"""
            <p>Please verify your email to activate your account.</p>
            <p style="background:#f5f5f5;padding:12px 16px;border-radius:6px;font-size:14px;letter-spacing:1px;text-align:center;">
                <strong>Verification Code:</strong><br>
                <span style="font-size:18px;">{verify_token}</span>
            </p>
            <p>You can either paste the code above in the app's verification screen, or click the link below:</p>
            <p>
                <a href="{verification_link}" 
                   style="background:#1976d2;color:#fff;padding:10px 18px;border-radius:4px;text-decoration:none;display:inline-block;">
                   Verify Email
                </a>
            </p>
            <p style="font-size:12px;color:#666;">
                If the button does not work, open this URL manually:<br>
                {verification_link}
            </p>
            """
        
        html_content += """
            <p>Welcome to our healthcare consultation platform!</p>
            <hr style="border:none;border-top:1px solid #ddd;margin:20px 0;">
            <p style="font-size:12px;color:#666;">
                This is an automated message. Please do not reply to this email.
            </p>
        </div>
        """
        
        # Create text content
        text_content = f"""
Welcome{' ' + role.capitalize() if role else ''}!

Thank you for registering as a {role} on the ConsultFlow Platform.
        """
        
        if verify_token:
            text_content += f"""

Please verify your email to activate your account.

Verification Code: {verify_token}

Verification Link: {verification_link}
            """
        
        text_content += """

Welcome to our healthcare consultation platform!

This is an automated message. Please do not reply to this email.
        """
        
        subject = f"Welcome to ConsultFlow - {role.capitalize()} Registration"
        if verify_token:
            subject += " (Email Verification Required)"
        
        await send_email(to, subject, html_content, text_content)
        
    except Exception as e:
        logger.error(f"Failed to send registration email to {to}: {e}")
        # Don't raise - registration should succeed even if email fails
