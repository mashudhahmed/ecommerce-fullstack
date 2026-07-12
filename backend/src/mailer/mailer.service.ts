import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import * as handlebars from 'handlebars';
import * as fs from 'fs';
import * as path from 'path';
import { User } from '../user/user.entity';

// ✅ Industry Standard: Use proper type
type TemplateFunction = HandlebarsTemplateDelegate;

@Injectable()
export class MailerService implements OnModuleInit {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(MailerService.name);
  private readonly fromName: string;
  private readonly fromEmail: string;
  private readonly frontendUrl: string;
  private readonly adminUrl: string;
  private templates: Map<string, TemplateFunction> = new Map();
  private templatesLoaded = false;
  private readonly templatePaths: {
    emails: string;
    partials: string;
    layouts: string;
  };

  constructor(private configService: ConfigService) {
    this.fromName = this.configService.get('email.fromName') || 'SnapCart';
    this.fromEmail = this.configService.get('email.user') || '';
    this.frontendUrl = this.configService.get('app.frontendUrl') || 'http://localhost:3000';
    this.adminUrl = `${this.frontendUrl}/admin`;

    // ✅ Production-ready: Initialize transporter with proper error handling
    this.initializeTransporter();

    // ✅ Resolve template paths with multiple fallbacks
    this.templatePaths = this.resolveTemplatePaths();
  }

  private initializeTransporter(): void {
    try {
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
        // ✅ Connection timeout for reliability
        connectionTimeout: 5000,
        greetingTimeout: 5000,
        socketTimeout: 10000,
      });

      // ✅ Verify SMTP connection on startup
      this.verifyConnection();
    } catch (error) {
      this.logger.error('❌ Failed to initialize email transporter:', error);
    }
  }

  private async verifyConnection(): Promise<void> {
    try {
      await this.transporter.verify();
      this.logger.log('✅ SMTP connection verified successfully');
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn('⚠️ SMTP connection verification failed. Email sending may not work:', msg);
    }
  }

  private resolveTemplatePaths(): { emails: string; partials: string; layouts: string } {
    // ✅ Try multiple possible paths (in order of priority)
    const possiblePaths = [
      // 1. From src directory (development)
      path.join(__dirname, '..', '..', 'src', 'mailer', 'templates'),
      // 2. From dist directory (production)
      path.join(__dirname, 'templates'),
      // 3. From project root (fallback)
      path.join(process.cwd(), 'src', 'mailer', 'templates'),
      // 4. From current directory (last resort)
      path.join(process.cwd(), 'templates'),
    ];

    let templatesPath = '';
    for (const p of possiblePaths) {
      const emailsPath = path.join(p, 'emails');
      if (fs.existsSync(emailsPath)) {
        templatesPath = p;
        this.logger.log(`✅ Found templates at: ${templatesPath}`);
        break;
      }
    }

    if (!templatesPath) {
      // ✅ Use fallback path and log warning
      templatesPath = path.join(__dirname, 'templates');
      this.logger.warn(`⚠️ Templates not found in any expected location. Using fallback: ${templatesPath}`);
    }

    return {
      emails: path.join(templatesPath, 'emails'),
      partials: path.join(templatesPath, 'partials'),
      layouts: path.join(templatesPath, 'layouts'),
    };
  }

  async onModuleInit(): Promise<void> {
    await this.loadTemplates();
  }

  private async loadTemplates(): Promise<void> {
    try {
      this.logger.log(`📁 Loading email templates from: ${this.templatePaths.emails}`);

      // ✅ Check if directories exist
      const dirsExist = this.ensureDirectoriesExist();
      if (!dirsExist) {
        this.logger.error('❌ Template directories are missing. Email templates will not work.');
        return;
      }

      // ✅ Register partials
      await this.registerPartials();

      // ✅ Load layout
      const layoutTemplate = await this.loadLayout();
      if (!layoutTemplate) {
        this.logger.error('❌ Layout template not found. Email templates will not work.');
        return;
      }

      // ✅ Load email templates
      await this.loadEmailTemplates(layoutTemplate);

      this.templatesLoaded = true;
      this.logger.log(`✅ Loaded ${this.templates.size} email templates successfully`);

      // ✅ Log available templates for debugging
      this.logTemplateNames();

    } catch (error) {
      this.logger.error('❌ Failed to load email templates:', error);
      this.templatesLoaded = false;
    }
  }

  private ensureDirectoriesExist(): boolean {
    const dirs = [
      { path: this.templatePaths.emails, name: 'emails' },
      { path: this.templatePaths.partials, name: 'partials' },
      { path: this.templatePaths.layouts, name: 'layouts' },
    ];

    let allExist = true;
    for (const dir of dirs) {
      if (!fs.existsSync(dir.path)) {
        this.logger.warn(`⚠️ ${dir.name} directory not found: ${dir.path}`);
        // ✅ Create directory if it doesn't exist
        try {
          fs.mkdirSync(dir.path, { recursive: true });
          this.logger.log(`✅ Created ${dir.name} directory: ${dir.path}`);
        } catch (error) {
          this.logger.error(`❌ Failed to create ${dir.name} directory:`, error);
          allExist = false;
        }
      }
    }
    return allExist;
  }

  private async registerPartials(): Promise<void> {
    try {
      if (!fs.existsSync(this.templatePaths.partials)) {
        return;
      }

      const files = fs.readdirSync(this.templatePaths.partials);
      let registered = 0;

      for (const file of files) {
        if (file.endsWith('.hbs')) {
          const name = path.basename(file, '.hbs');
          const content = fs.readFileSync(
            path.join(this.templatePaths.partials, file),
            'utf-8'
          );
          handlebars.registerPartial(name, content);
          registered++;
        }
      }

      if (registered > 0) {
        this.logger.log(`✅ Registered ${registered} partials`);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.warn('⚠️ Failed to register partials:', msg);
    }
  }

  private async loadLayout(): Promise<TemplateFunction | null> {
    try {
      const layoutPath = path.join(this.templatePaths.layouts, 'main.hbs');
      
      if (!fs.existsSync(layoutPath)) {
        this.logger.warn(`⚠️ Layout file not found: ${layoutPath}`);
        return null;
      }

      const content = fs.readFileSync(layoutPath, 'utf-8');
      return handlebars.compile(content);
    } catch (error) {
      this.logger.error('❌ Failed to load layout:', error);
      return null;
    }
  }

  private async loadEmailTemplates(layoutTemplate: TemplateFunction): Promise<void> {
    try {
      const files = fs.readdirSync(this.templatePaths.emails);

      if (files.length === 0) {
        this.logger.warn('⚠️ No email templates found in directory');
        return;
      }

      let loaded = 0;

      for (const file of files) {
        if (!file.endsWith('.hbs')) continue;

        const name = path.basename(file, '.hbs');
        const filePath = path.join(this.templatePaths.emails, file);
        const content = fs.readFileSync(filePath, 'utf-8');

        // ✅ Skip empty files
        if (content.trim().length === 0) {
          this.logger.warn(`⚠️ Template "${name}" is empty, skipping`);
          continue;
        }

        // ✅ Compile template with layout
        const emailTemplate = handlebars.compile(content);
        this.templates.set(name, (data: any) => {
          const body = emailTemplate(data);
          return layoutTemplate({
            ...data,
            body,
            frontendUrl: this.frontendUrl,
            year: new Date().getFullYear(),
          });
        });

        loaded++;
      }

      this.logger.log(`✅ Loaded ${loaded} email templates`);

    } catch (error) {
      this.logger.error('❌ Failed to load email templates:', error);
    }
  }

  private logTemplateNames(): void {
    const names = Array.from(this.templates.keys());
    if (names.length > 0) {
      this.logger.log(`📋 Available templates: ${names.join(', ')}`);
    } else {
      this.logger.warn('⚠️ No templates loaded');
    }
  }

  private renderTemplate(templateName: string, data: any): string {
    // ✅ Check if templates are loaded
    if (!this.templatesLoaded) {
      this.logger.warn(`⚠️ Templates not loaded, attempting to reload...`);
      this.loadTemplates();
      
      if (!this.templatesLoaded) {
        throw new Error('Email templates failed to load. Please check template files.');
      }
    }

    const template = this.templates.get(templateName);
    if (!template) {
      const available = Array.from(this.templates.keys());
      this.logger.error(`❌ Template "${templateName}" not found`);
      this.logger.log(`📋 Available templates: ${available.join(', ') || 'None'}`);
      
      // ✅ Try to load templates again (in case they were added after startup)
      this.loadTemplates();
      
      // ✅ Check again
      const retryTemplate = this.templates.get(templateName);
      if (retryTemplate) {
        this.logger.log(`✅ Template "${templateName}" loaded on retry`);
        return retryTemplate({
          ...data,
          year: new Date().getFullYear(),
          frontendUrl: this.frontendUrl,
          adminUrl: this.adminUrl,
        });
      }

      // ✅ Return fallback HTML if template not found
      this.logger.error(`❌ Template "${templateName}" still not found after retry`);
      return this.getFallbackTemplate(templateName, data);
    }

    try {
      return template({
        ...data,
        year: new Date().getFullYear(),
        frontendUrl: this.frontendUrl,
        adminUrl: this.adminUrl,
      });
    } catch (error) {
      this.logger.error(`❌ Error rendering template "${templateName}":`, error);
      return this.getFallbackTemplate(templateName, data);
    }
  }

  private getFallbackTemplate(templateName: string, data: any): string {
    // ✅ Simple fallback template when .hbs files are missing
    return `
      <!DOCTYPE html>
      <html>
      <head><meta charset="UTF-8"><title>${templateName}</title></head>
      <body style="font-family: Arial, sans-serif; padding: 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: #f8f9fa; padding: 30px; border-radius: 8px;">
          <h2 style="color: #f97316;">SnapCart</h2>
          <hr style="border: none; border-top: 1px solid #e0e0e0;">
          <div style="padding: 20px 0;">
            <p>Hello ${data.name || 'User'},</p>
            <p>${this.getFallbackMessage(templateName, data)}</p>
          </div>
          <hr style="border: none; border-top: 1px solid #e0e0e0;">
          <p style="color: #888; font-size: 12px; text-align: center;">
            &copy; ${new Date().getFullYear()} SnapCart. All rights reserved.
          </p>
        </div>
      </body>
      </html>
    `;
  }

  private getFallbackMessage(templateName: string, data: any): string {
    const messages: Record<string, string> = {
      'verification': `Your verification code is: <strong>${data.code}</strong>`,
      'password-reset': `Your password reset code is: <strong>${data.code}</strong>`,
      'two-factor-code': `Your 2FA verification code is: <strong>${data.code}</strong>`,
      'welcome': `Welcome to SnapCart! We're excited to have you.`,
      'order-confirmation': `Your order #${data.orderId} has been confirmed. Total: $${data.total}`,
      'order-status-update': `Your order #${data.orderId} status is now: ${data.status}`,
      'vendor-approval': `Your vendor account has been approved!`,
      'vendor-rejection': `Your vendor application has been reviewed.`,
      'login-notification': `Your account was accessed at ${data.loginTime}`,
      'password-changed': `Your password has been changed successfully.`,
      'account-deletion': `Your account has been deleted.`,
      'two-factor-backup-codes': `Your backup codes have been generated.`,
      'vendor-registration': `A new vendor has registered.`,
    };
    return messages[templateName] || `Email template "${templateName}" is not available.`;
  }

  // ============================================================
  // PUBLIC EMAIL METHODS
  // ============================================================

  async sendTwoFactorCode(to: string, code: string, userName: string) {
    const html = this.renderTemplate('two-factor-code', { name: userName, code });
    return this.sendMail(to, '🔐 Your 2FA Verification Code', html);
  }

  async sendTwoFactorBackupCodes(to: string, backupCodes: string[], userName: string) {
    const html = this.renderTemplate('two-factor-backup-codes', { name: userName, codes: backupCodes });
    return this.sendMail(to, '🔑 Your 2FA Backup Codes', html);
  }

  async sendVerificationEmail(to: string, verificationCode: string, userName: string) {
    const html = this.renderTemplate('verification', { name: userName, code: verificationCode });
    return this.sendMail(to, 'Verify Your Email Address', html);
  }

  async sendWelcomeEmail(to: string, userName: string) {
    const html = this.renderTemplate('welcome', { name: userName });
    return this.sendMail(to, `Welcome to SnapCart, ${userName}!`, html);
  }

  async sendPasswordResetCode(to: string, resetCode: string, userName: string) {
    const html = this.renderTemplate('password-reset', { name: userName, code: resetCode });
    return this.sendMail(to, 'Password Reset Code', html);
  }

  async sendLoginNotification(to: string, userName: string, ipAddress?: string, userAgent?: string) {
    const html = this.renderTemplate('login-notification', {
      name: userName,
      loginTime: new Date().toLocaleString(),
      ipAddress,
      userAgent,
    });
    return this.sendMail(to, 'Login Notification', html);
  }

  async sendPasswordChangedConfirmation(to: string, userName: string) {
    const html = this.renderTemplate('password-changed', { name: userName });
    return this.sendMail(to, 'Password Changed Successfully', html);
  }

  async sendAccountDeletionEmail(to: string, userName: string) {
    const html = this.renderTemplate('account-deletion', { name: userName });
    return this.sendMail(to, 'Account Deletion Confirmation', html);
  }

  async sendVendorRegistrationNotification(vendor: User) {
    const html = this.renderTemplate('vendor-registration', {
      vendor: {
        name: vendor.name,
        email: vendor.email,
        businessName: vendor.vendorBusinessName || 'N/A',
        businessDescription: vendor.vendorBusinessDescription,
        phone: vendor.vendorPhoneNumber,
        address: vendor.vendorAddress,
        registration: vendor.vendorBusinessRegistration,
      },
    });

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
    const html = this.renderTemplate('vendor-approval', { name: userName });
    return this.sendMail(to, 'Vendor Account Approved!', html);
  }

  async sendVendorRejectionEmail(to: string, userName: string, reason?: string) {
    const html = this.renderTemplate('vendor-rejection', { name: userName, reason });
    return this.sendMail(to, 'Vendor Account Update', html);
  }

  async sendOrderConfirmation(to: string, order: any) {
    const html = this.renderTemplate('order-confirmation', {
      customerName: order.user?.name || 'Customer',
      orderId: order.id,
      items: (order.items || []).map((item: any) => ({
        name: item.product?.title || 'Product',
        quantity: item.quantity,
        price: Number(item.price).toFixed(2),
      })),
      total: Number(order.total).toFixed(2),
    });
    return this.sendMail(to, `Order Confirmation #${order.id}`, html);
  }

  async sendOrderStatusUpdate(to: string, order: any, status: string) {
    const html = this.renderTemplate('order-status-update', {
      customerName: order.user?.name || 'Customer',
      orderId: order.id,
      status: status.toUpperCase(),
      total: Number(order.total).toFixed(2),
      orderDate: new Date(order.createdAt).toLocaleDateString(),
    });
    return this.sendMail(to, `Order Status Update - #${order.id}`, html);
  }

  // ============================================================
  // BASE SEND METHOD
  // ============================================================

  async sendMail(to: string, subject: string, html: string) {
    if (!to || !html) {
      this.logger.error('❌ Invalid email parameters: missing "to" or "html"');
      throw new Error('Invalid email parameters');
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to,
        subject,
        html,
      });
      this.logger.log(`📧 Email sent to ${to}: ${subject}`);
      return info;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`❌ Failed to send email to ${to}: ${errorMessage}`);
      throw error;
    }
  }

  // ✅ Utility method to check template availability
  getLoadedTemplates(): string[] {
    return Array.from(this.templates.keys());
  }

  // ✅ Utility method to reload templates dynamically
  async reloadTemplates(): Promise<void> {
    this.logger.log('🔄 Reloading email templates...');
    this.templates.clear();
    await this.loadTemplates();
  }
}