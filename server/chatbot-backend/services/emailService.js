const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    // In production, you would configure this with your email service
    // For now, we'll use a test configuration that logs to console
    this.transporter = null;
    this.isDevelopment = process.env.NODE_ENV !== 'production';
  }

  async initializeTransporter() {
    if (this.isDevelopment) {
      // For development, we'll just log emails to console
      console.log('📧 Email service initialized in development mode (console logging)');
      return;
    }

    // Production email configuration (uncomment and configure as needed)
    /*
    this.transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
    */
  }

  async sendPasswordResetEmail(email, resetToken, username) {
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
    
    const emailContent = {
      to: email,
      from: process.env.FROM_EMAIL || 'noreply@ontrack.com',
      subject: 'OnTrack - Password Reset Request',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">OnTrack</h1>
            <p style="color: #f0f0f0; margin: 10px 0 0 0;">AI-Powered Train Maintenance Assistant</p>
          </div>
          
          <div style="padding: 30px; background: #ffffff;">
            <h2 style="color: #333; margin-bottom: 20px;">Password Reset Request</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              Hello ${username},
            </p>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              We received a request to reset your password for your OnTrack account. If you didn't make this request, you can safely ignore this email.
            </p>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 30px;">
              To reset your password, click the button below:
            </p>
            
            <div style="text-align: center; margin-bottom: 30px;">
              <a href="${resetLink}" 
                 style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              If the button doesn't work, you can copy and paste this link into your browser:
            </p>
            
            <p style="color: #667eea; word-break: break-all; margin-bottom: 30px; padding: 10px; background: #f8f9fa; border-radius: 3px;">
              ${resetLink}
            </p>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              This password reset link will expire in 1 hour for security reasons.
            </p>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              This email was sent by OnTrack. If you have any questions, please contact our support team.
            </p>
          </div>
        </div>
      `,
      text: `
        OnTrack - Password Reset Request
        
        Hello ${username},
        
        We received a request to reset your password for your OnTrack account. If you didn't make this request, you can safely ignore this email.
        
        To reset your password, visit this link: ${resetLink}
        
        This password reset link will expire in 1 hour for security reasons.
        
        If you have any questions, please contact our support team.
      `
    };

    if (this.isDevelopment) {
      // Log email to console in development
      console.log('📧 Password Reset Email (Development Mode):');
      console.log('To:', emailContent.to);
      console.log('Subject:', emailContent.subject);
      console.log('Reset Link:', resetLink);
      console.log('Full HTML content would be sent in production');
      return { success: true, messageId: 'dev-' + Date.now() };
    }

    try {
      // Send actual email in production
      if (!this.transporter) {
        throw new Error('Email transporter not configured');
      }
      
      const result = await this.transporter.sendMail(emailContent);
      console.log('📧 Password reset email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('📧 Failed to send password reset email:', error);
      throw new Error('Failed to send password reset email');
    }
  }

  async sendWelcomeEmail(email, username) {
    const emailContent = {
      to: email,
      from: process.env.FROM_EMAIL || 'noreply@ontrack.com',
      subject: 'Welcome to OnTrack!',
      html: `
        <div style="max-width: 600px; margin: 0 auto; font-family: Arial, sans-serif;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
            <h1 style="color: white; margin: 0;">Welcome to OnTrack!</h1>
            <p style="color: #f0f0f0; margin: 10px 0 0 0;">AI-Powered Train Maintenance Assistant</p>
          </div>
          
          <div style="padding: 30px; background: #ffffff;">
            <h2 style="color: #333; margin-bottom: 20px;">Welcome aboard, ${username}!</h2>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              Thank you for joining OnTrack. Your account has been successfully created and your personal AI assistant has been provisioned.
            </p>
            
            <p style="color: #666; line-height: 1.6; margin-bottom: 20px;">
              With OnTrack, you can:
            </p>
            
            <ul style="color: #666; line-height: 1.8; margin-bottom: 30px;">
              <li>Get intelligent assistance for train maintenance procedures</li>
              <li>Access technical documentation and schematics</li>
              <li>Identify train components with AI-powered recognition</li>
              <li>Save and search your conversation history</li>
              <li>Export your data and manage your account</li>
            </ul>
            
            <div style="text-align: center; margin-bottom: 30px;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" 
                 style="background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block; font-weight: bold;">
                Start Using OnTrack
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              This email was sent by OnTrack. If you have any questions, please contact our support team.
            </p>
          </div>
        </div>
      `,
      text: `
        Welcome to OnTrack!
        
        Thank you for joining OnTrack, ${username}. Your account has been successfully created and your personal AI assistant has been provisioned.
        
        With OnTrack, you can get intelligent assistance for train maintenance, access technical documentation, identify components, and much more.
        
        Start using OnTrack at: ${process.env.FRONTEND_URL || 'http://localhost:3000'}
      `
    };

    if (this.isDevelopment) {
      console.log('📧 Welcome Email (Development Mode):');
      console.log('To:', emailContent.to);
      console.log('Subject:', emailContent.subject);
      console.log('Welcome message would be sent in production');
      return { success: true, messageId: 'dev-welcome-' + Date.now() };
    }

    try {
      if (!this.transporter) {
        throw new Error('Email transporter not configured');
      }
      
      const result = await this.transporter.sendMail(emailContent);
      console.log('📧 Welcome email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('📧 Failed to send welcome email:', error);
      // Don't throw error for welcome emails, just log it
      return { success: false, error: error.message };
    }
  }
}

// Create singleton instance
const emailService = new EmailService();
emailService.initializeTransporter();

module.exports = emailService; 