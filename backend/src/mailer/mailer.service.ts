import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailerService {
  private transporter: nodemailer.Transporter;
  constructor(private cfg: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: cfg.get('SMTP_HOST'),
      port: Number(cfg.get('SMTP_PORT')),
      secure: false,
      auth: {
        user: cfg.get('SMTP_USER'),
        pass: cfg.get('SMTP_PASS')
      }
    });
  }

  // ✅ NEW: Verification email for account registration
  async sendVerificationEmail(to: string, verificationCode: string, userName: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Verify Your Email Address</h2>
        <p>Hello ${userName},</p>
        <p>Thank you for registering! Use the 6-digit verification code below to activate your account:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <div style="display: inline-block; padding: 20px; background: #f8f9fa; border: 2px dashed #dee2e6; border-radius: 10px;">
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #28a745;">
              ${verificationCode}
            </div>
          </div>
        </div>

        <p style="text-align: center; font-size: 14px; color: #666;">
          Enter this code on the verification page to activate your account.
        </p>

        <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin-top: 20px;">
          <p style="margin: 0; color: #856404;">
            <strong>Note:</strong> This code will expire in 24 hours. 
          </p>
        </div>
        
        <p style="margin-top: 20px; color: #666;">
          If you didn't create an account, please ignore this email.
        </p>
      </div>
    `;

    return this.transporter.sendMail({
      from: `"HealthScope" <${this.transporter.options.auth.user}>`,
      to,
      subject: 'Verify Your Email Address - Account Activation',
      html,
    });
  }

  // Existing email methods...
  async sendOrderConfirmation(to: string, order: any) {
    const itemsHtml = (order.items || []).map(it => `<li>${it.product.title} x ${it.quantity} — ${it.price}</li>`).join('');
    const html = `<h3>Order #${order.id}</h3><p>Total: ${order.total}</p><ul>${itemsHtml}</ul>`;
    return this.transporter.sendMail({
      from: this.transporter.options.auth.user,
      to,
      subject: `Order Confirmation #${order.id}`,
      html
    });
  }

  async sendWelcomeEmail(to: string, userName: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to Our Store, ${userName}!</h2>
        <p>We're excited to have you as a new member of our community.</p>
        <p>As a welcome gift, here's a 10% discount code: <strong>WELCOME10</strong></p>
        <div style="margin-top: 20px; padding: 15px; background: #f0f8ff; border-radius: 5px;">
          <p>Start shopping now and discover our amazing products!</p>
          <a href="https://yourstore.com/products" style="display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">Browse Products</a>
        </div>
      </div>
    `;

    return this.transporter.sendMail({
      from: `"HealthScope" <${this.transporter.options.auth.user}>`,
      to,
      subject: `Welcome to Our Store, ${userName}!`,
      html,
    });
  }

  async sendPasswordResetCode(to: string, resetCode: string, userName: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Reset Code</h2>
        <p>Hello ${userName},</p>
        <p>We received a request to reset your password. Use the 6-digit code below to verify your identity:</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <div style="display: inline-block; padding: 20px; background: #f8f9fa; border: 2px dashed #dee2e6; border-radius: 10px;">
            <div style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #dc3545;">
              ${resetCode}
            </div>
          </div>
        </div>

        <p style="text-align: center; font-size: 14px; color: #666;">
          Enter this code on the password reset page to continue.
        </p>

        <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin-top: 20px;">
          <p style="margin: 0; color: #856404;">
            <strong>Security Note:</strong> This code will expire in 15 minutes. 
            If you didn't request this, please ignore this email.
          </p>
        </div>
      </div>
    `;

    return this.transporter.sendMail({
      from: `"HealthScope" <${this.transporter.options.auth.user}>`,
      to,
      subject: 'Password Reset Code - Valid for 15 minutes',
      html,
    });
  }

  async sendLoginNotification(to: string, userName: string) {
    const loginTime = new Date().toLocaleString();
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Login Notification</h2>
        <p>Hello ${userName},</p>
        <p>Your account was successfully accessed on:</p>
        <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <strong>Date & Time:</strong> ${loginTime}
        </div>
        <p>If this wasn't you, please contact support immediately.</p>
        <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-radius: 5px;">
          <p style="margin: 0; color: #856404;">Security Tip: Always use strong, unique passwords!</p>
        </div>
      </div>
    `;

    return this.transporter.sendMail({
      from: `"HealthScope" <${this.transporter.options.auth.user}>`,
      to,
      subject: 'Login Notification - Your Account Was Accessed',
      html,
    });
  }

  async sendAccountDeletionEmail(to: string, userName: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Account Successfully Deleted</h2>
        <p>Hello ${userName},</p>
        <p>Your account has been successfully deleted from our system.</p>
        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Email:</strong> ${to}</p>
          <p><strong>Deletion Date:</strong> ${new Date().toLocaleDateString()}</p>
        </div>
        <p>We're sorry to see you go. If this was a mistake or you'd like to recreate your account, 
           you can always register again.</p>
        <p>Thank you for being part of our community.</p>
      </div>
    `;

    return this.transporter.sendMail({
      from: `"HealthScope" <${this.transporter.options.auth.user}>`,
      to,
      subject: 'Account Deletion Confirmation',
      html,
    });
  }

  async sendCustomEmail(to: string, subject: string, htmlContent: string, textContent?: string) {
    return this.transporter.sendMail({
      from: `"HealthScope" <${this.transporter.options.auth.user}>`,
      to,
      subject,
      html: htmlContent,
      text: textContent,
    });
  }
}