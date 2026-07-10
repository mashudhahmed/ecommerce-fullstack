import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { User } from '../user/user.entity';

@Injectable()
export class MailerService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailerService.name);
  private readonly fromName: string;
  private readonly fromEmail: string;

  constructor(private configService: ConfigService) {
    this.fromName = this.configService.get('email.fromName') || 'E-Commerce Store';
    this.fromEmail = this.configService.get('email.user') || '';

    this.transporter = nodemailer.createTransport({
      host: this.configService.get('email.host'),
      port: this.configService.get('email.port'),
      secure: this.configService.get('email.secure') || false,
      auth: {
        user: this.fromEmail,
        pass: this.configService.get('email.pass'),
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
  }

  // ============================================================
  // ✅ NEW: Send 2FA verification code via email
  // ============================================================
  async sendTwoFactorCode(to: string, code: string, userName: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #f97316;">🔐 Two-Factor Authentication</h2>
        </div>
        
        <p>Hello ${userName},</p>
        
        <p>Enter the 6-digit verification code below to complete your login:</p>
        
        <div style="text-align: center; margin: 30px 0; padding: 20px; background: #f8f9fa; border: 2px dashed #dee2e6; border-radius: 10px;">
          <div style="font-size: 36px; font-weight: bold; letter-spacing: 10px; color: #f97316;">
            ${code}
          </div>
        </div>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin-top: 20px;">
          <p style="margin: 0; color: #856404; font-size: 14px;">
            <strong>⚠️ Security Note:</strong> This code will expire in <strong>5 minutes</strong>.
            If you didn't request this code, please ignore this email and secure your account.
          </p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
        
        <p style="color: #666; font-size: 12px; text-align: center;">
          This is an automated message from SnapCart. Please do not reply to this email.
        </p>
      </div>
    `;

    return this.sendMail(to, '🔐 Your 2FA Verification Code', html);
  }

  // ============================================================
  // ✅ NEW: Send 2FA backup codes via email
  // ============================================================
  async sendTwoFactorBackupCodes(to: string, backupCodes: string[], userName: string) {
    const codesHtml = backupCodes.map(code => `<div style="display: inline-block; padding: 8px 16px; margin: 4px; background: #f8f9fa; border: 1px solid #dee2e6; border-radius: 4px; font-family: monospace; font-size: 16px;">${code}</div>`).join('');

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <div style="text-align: center; margin-bottom: 20px;">
          <h2 style="color: #f97316;">🔑 Your 2FA Backup Codes</h2>
        </div>
        
        <p>Hello ${userName},</p>
        
        <p>Here are your backup codes for two-factor authentication. Store them in a safe place:</p>
        
        <div style="text-align: center; margin: 20px 0; padding: 20px; background: #f8f9fa; border: 2px solid #dee2e6; border-radius: 10px;">
          ${codesHtml}
        </div>
        
        <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin-top: 20px;">
          <p style="margin: 0; color: #856404; font-size: 14px;">
            <strong>⚠️ Important:</strong> Each backup code can be used only once. 
            If you lose your authenticator app, you can use these codes to log in.
          </p>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 20px 0;" />
        
        <p style="color: #666; font-size: 12px; text-align: center;">
          This is an automated message from SnapCart. Please do not reply to this email.
        </p>
      </div>
    `;

    return this.sendMail(to, '🔑 Your 2FA Backup Codes', html);
  }

  // ============================================================
  // EXISTING METHODS (Keep all your existing methods below)
  // ============================================================

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

    return this.sendMail(to, 'Verify Your Email Address', html);
  }

  async sendWelcomeEmail(to: string, userName: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Welcome to Our Store, ${userName}!</h2>
        <p>We're excited to have you as a new member of our community.</p>
        <p>Start shopping now and discover our amazing products!</p>
        <div style="margin-top: 20px; padding: 15px; background: #f0f8ff; border-radius: 5px;">
          <a href="${this.configService.get('app.frontendUrl') || '#'}" style="display: inline-block; padding: 10px 20px; background: #007bff; color: white; text-decoration: none; border-radius: 5px;">Browse Products</a>
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

  async sendVendorRegistrationNotification(vendor: User) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">New Vendor Registration</h2>
        <p>A new vendor has registered and is awaiting approval:</p>
        <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Name:</strong> ${vendor.name}</p>
          <p><strong>Email:</strong> ${vendor.email}</p>
          <p><strong>Business Name:</strong> ${vendor.vendorBusinessName || 'N/A'}</p>
          <p><strong>Business Description:</strong> ${vendor.vendorBusinessDescription || 'N/A'}</p>
          <p><strong>Phone:</strong> ${vendor.vendorPhoneNumber || 'N/A'}</p>
          <p><strong>Address:</strong> ${vendor.vendorAddress || 'N/A'}</p>
          <p><strong>Registration:</strong> ${vendor.vendorBusinessRegistration || 'N/A'}</p>
        </div>
        <p>Please review and approve/reject this vendor request.</p>
      </div>
    `;

    const adminEmails = this.configService.get('email.adminEmails')?.split(',') || [];
    if (adminEmails.length === 0) {
      this.logger.warn('No admin emails configured for vendor notifications');
      return;
    }

    for (const adminEmail of adminEmails) {
      await this.sendMail(adminEmail.trim(), 'New Vendor Registration - Pending Approval', html);
    }
  }

  async sendVendorApprovalEmail(to: string, userName: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Vendor Account Approved!</h2>
        <p>Hello ${userName},</p>
        <p>We're happy to inform you that your vendor account has been approved.</p>
        <p>You can now start listing your products on our platform.</p>
        <div style="margin-top: 20px; padding: 15px; background: #f0f8ff; border-radius: 5px;">
          <a href="${this.configService.get('app.frontendUrl')}/vendor/dashboard" style="display: inline-block; padding: 10px 20px; background: #28a745; color: white; text-decoration: none; border-radius: 5px;">Go to Vendor Dashboard</a>
        </div>
      </div>
    `;

    return this.sendMail(to, 'Vendor Account Approved!', html);
  }

  async sendVendorRejectionEmail(to: string, userName: string, reason?: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Vendor Account Update</h2>
        <p>Hello ${userName},</p>
        <p>We have reviewed your vendor registration request.</p>
        <p>Unfortunately, we are unable to approve your vendor account at this time.</p>
        ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        <p>If you have any questions, please contact our support team.</p>
      </div>
    `;

    return this.sendMail(to, 'Vendor Account Update', html);
  }

  async sendOrderConfirmation(to: string, order: any) {
    const itemsHtml = (order.items || [])
      .map(
        (item: any) =>
          `<li>${item.product?.title || 'Product'} x ${item.quantity} — $${item.price}</li>`,
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

  async sendOrderStatusUpdate(to: string, order: any, status: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Order Status Update</h2>
        <p>Hello ${order.user?.name || 'Customer'},</p>
        <p>Your order <strong>#${order.id}</strong> status has been updated.</p>
        
        <div style="text-align: center; margin: 30px 0;">
          <div style="display: inline-block; padding: 15px 30px; background: #007bff; color: white; border-radius: 5px; font-size: 20px; font-weight: bold;">
            ${status.toUpperCase()}
          </div>
        </div>

        <div style="background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Order Total:</strong> $${order.total}</p>
          <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
        </div>

        <p style="margin-top: 20px;">Thank you for shopping with us!</p>
      </div>
    `;

    return this.sendMail(to, `Order Status Update - #${order.id}`, html);
  }

  async sendMail(to: string, subject: string, html: string) {
    try {
      const info = await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
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