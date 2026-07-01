import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MailerService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailerService.name);

  constructor(private configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('email.host'),
      port: this.configService.get('email.port'),
      secure: false,
      auth: {
        user: this.configService.get('email.user'),
        pass: this.configService.get('email.pass'),
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  async sendVerificationEmail(
    to: string,
    verificationCode: string,
    userName: string,
  ) {
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

    return this.sendMail(to, 'Verify Your Email Address', html);
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

    return this.sendMail(to, `Welcome to Our Store, ${userName}!`, html);
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
          </p>
        </div>
      </div>
    `;

    return this.sendMail(to, 'Password Reset Code', html);
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
      </div>
    `;

    return this.sendMail(to, 'Login Notification', html);
  }

  async sendPasswordChangedConfirmation(to: string, userName: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Changed Successfully</h2>
        <p>Hello ${userName},</p>
        <p>Your password has been successfully changed.</p>
        <p>If you didn't make this change, please contact support immediately.</p>
      </div>
    `;

    return this.sendMail(to, 'Password Changed Successfully', html);
  }

  async sendAccountDeletionEmail(to: string, userName: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Account Successfully Deleted</h2>
        <p>Hello ${userName},</p>
        <p>Your account has been successfully deleted from our system.</p>
        <p>We're sorry to see you go. If this was a mistake, you can always register again.</p>
      </div>
    `;

    return this.sendMail(to, 'Account Deletion Confirmation', html);
  }

  async sendOrderConfirmation(to: string, order: any) {
    const itemsHtml = (order.items || [])
      .map(
        (item) =>
          `<li>${item.product.title} x ${item.quantity} — $${item.price}</li>`,
      )
      .join('');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Order Confirmation #${order.id}</h2>
        <p><strong>Total:</strong> $${order.total}</p>
        <h3>Items:</h3>
        <ul>${itemsHtml}</ul>
        <p>Thank you for your order!</p>
      </div>
    `;

    return this.sendMail(to, `Order Confirmation #${order.id}`, html);
  }

  /**
   * Send order status update email
   */
  async sendOrderStatusUpdate(to: string, order: any, status: string) {
    const itemsHtml = (order.items || [])
      .map(
        (item) =>
          `<li>${item.product?.title || 'Product'} x ${item.quantity} — $${item.price}</li>`,
      )
      .join('');

    const statusColors = {
      pending: '#ffc107',
      processing: '#17a2b8',
      shipped: '#007bff',
      delivered: '#28a745',
      cancelled: '#dc3545',
    };

    const statusColor = statusColors[status] || '#6c757d';

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Order Status Update</h2>
        <p>Hello ${order.user?.name || 'Customer'},</p>
        <p>Your order <strong>#${order.id}</strong> status has been updated.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <div style="display: inline-block; padding: 15px 30px; background: ${statusColor}; color: white; border-radius: 5px; font-size: 20px; font-weight: bold;">
            ${status.toUpperCase()}
          </div>
        </div>

        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Order Total:</strong> $${order.total}</p>
          <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
        </div>

        <h3>Items:</h3>
        <ul style="list-style: none; padding: 0;">
          ${itemsHtml}
        </ul>

        <p style="margin-top: 20px;">Thank you for shopping with us!</p>
        
        <div style="background: #f8f9fa; padding: 10px; border-radius: 5px; margin-top: 20px; font-size: 12px; color: #666;">
          <p>If you have any questions about your order, please contact our support team.</p>
        </div>
      </div>
    `;

    return this.sendMail(to, `Order Status Update - #${order.id}`, html);
  }

  /**
   * Send a custom email
   */
  async sendCustomEmail(to: string, subject: string, html: string, text?: string) {
    return this.sendMail(to, subject, html);
  }

  async sendMail(to: string, subject: string, html: string) {
    try {
      const info = await this.transporter.sendMail({
        from: `"HealthScope" <${this.configService.get('email.user')}>`,
        to,
        subject,
        html,
      });
      this.logger.log(`Email sent to ${to}: ${subject}`);
      return info;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to send email to ${to}: ${errorMessage}`);
      throw error;
    }
  }
}