// src/auth/auth.controller.ts
import {
  Controller,
  Post,
  Body,
  Get,
  Delete,
  Param,
  ParseIntPipe,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
  Res,
  Patch,
  Query,
  ValidationPipe,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { Throttle, SkipThrottle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import passport from 'passport';
import { AuthService } from './auth.service';
import { TwoFactorService } from './two-factor.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { RegisterUserDto } from './dto/register-user.dto';
import { RegisterVendorDto } from './dto/register-vendor.dto';
import { LoginDto } from './dto/login.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { VerifyResetCodeDto } from './dto/verify-reset-code.dto';
import { UserRole } from '../user/user.entity';
import {
  EnableTwoFactorDto,
  VerifyTwoFactorDto,
  DisableTwoFactorDto,
} from './dto/enable-2fa.dto';

const isProd =
  process.env.NODE_ENV === 'production' ||
  Boolean(process.env.RENDER) ||
  Boolean(process.env.RENDER_EXTERNAL_URL);
const ACCESS_COOKIE = 'access_token';
const REFRESH_COOKIE = 'refresh_token';
const REFRESH_COOKIE_PATH = '/api/v1/auth/refresh';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly twoFactorService: TwoFactorService,
    private readonly configService: ConfigService,
  ) {}

  // ============================================================
  // COOKIE HELPERS
  // ============================================================
  private setAuthCookies(res: Response, tokens: any) {
    const isSecureEnvironment =
      isProd ||
      Boolean(process.env.RENDER) ||
      Boolean(process.env.RENDER_EXTERNAL_URL) ||
      Boolean(process.env.DATABASE_URL?.includes('neon.tech'));

    const sameSite: 'none' | 'lax' = isSecureEnvironment ? 'none' : 'lax';
    const baseOpts = {
      httpOnly: true,
      secure: isSecureEnvironment,
      sameSite,
      path: '/',
      ...(isSecureEnvironment ? { partitioned: true } : {}),
    };

    res.cookie(ACCESS_COOKIE, tokens.accessToken, {
      ...baseOpts,
      maxAge: tokens.accessTokenExpiresIn * 1000,
    });

    res.cookie(REFRESH_COOKIE, tokens.refreshToken, {
      ...baseOpts,
      path: REFRESH_COOKIE_PATH,
      maxAge: tokens.refreshTokenExpiresIn * 1000,
    });
  }

  private clearAuthCookies(res: Response) {
    const isSecureEnvironment =
      isProd ||
      Boolean(process.env.RENDER) ||
      Boolean(process.env.RENDER_EXTERNAL_URL) ||
      Boolean(process.env.DATABASE_URL?.includes('neon.tech'));

    const sameSite: 'none' | 'lax' = isSecureEnvironment ? 'none' : 'lax';
    const clearOpts = {
      secure: isSecureEnvironment,
      sameSite,
      ...(isSecureEnvironment ? { partitioned: true } : {}),
    };
    res.clearCookie(ACCESS_COOKIE, { ...clearOpts, path: '/' });
    res.clearCookie(REFRESH_COOKIE, { ...clearOpts, path: REFRESH_COOKIE_PATH });
  }

  private requestMeta(req: Request) {
    return {
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip || req.socket.remoteAddress,
    };
  }

  private resolveCallbackUrl(req: any): string {
    // 1. Explicit configured environment variable
    let configuredCallback = this.configService.get<string>(
      'google.callbackUrl',
    );

    // If configuredCallback points to Vercel (frontend) or localhost in production, discard it
    if (
      configuredCallback &&
      (configuredCallback.includes('vercel.app') ||
        (isProd && configuredCallback.includes('localhost')))
    ) {
      this.logger.warn(
        `⚠️ Invalid GOOGLE_CALLBACK_URL configured (${configuredCallback}): points to frontend/localhost. Overriding with backend URL.`,
      );
      configuredCallback = undefined;
    }

    if (configuredCallback) {
      let clean = configuredCallback.trim();
      if (isProd && clean.startsWith('http://')) {
        clean = clean.replace('http://', 'https://');
      }
      clean = clean.replace(/([^:]\/)\/+/g, '$1');
      return clean;
    }

    // 2. Dynamic host from reverse proxy (Cloudflare/Render sets x-forwarded-host and x-forwarded-proto)
    const host = req.headers?.['x-forwarded-host'] || req.headers?.['host'];
    const proto =
      req.headers?.['x-forwarded-proto'] || (req.secure ? 'https' : 'http');
    if (
      host &&
      !host.includes('localhost') &&
      !host.includes('127.0.0.1') &&
      !host.includes('vercel.app')
    ) {
      const cleanProto = isProd ? 'https' : proto;
      return `${cleanProto}://${host}/api/v1/auth/google/callback`;
    }

    // 3. Fallback for production or Render
    if (isProd || Boolean(process.env.RENDER)) {
      return 'https://snapcart-backend-kaf4.onrender.com/api/v1/auth/google/callback';
    }

    // 4. Local development
    return 'http://localhost:3001/api/v1/auth/google/callback';
  }

  private resolveFrontendUrl(req: any): string {
    // 1. Explicit query origin (sent from frontend)
    const queryOrigin = req.query?.origin || req.query?.frontendUrl;
    if (queryOrigin && typeof queryOrigin === 'string') {
      const clean = queryOrigin.trim().replace(/\/+$/, '');
      if (
        clean.includes('vercel.app') ||
        (!isProd && clean.includes('localhost'))
      ) {
        return clean;
      }
    }

    // 2. Referer or Origin headers
    const origin = req.headers?.['origin'] as string;
    const referer = req.headers?.['referer'] as string;

    if (origin) {
      const clean = origin.trim().replace(/\/+$/, '');
      if (
        clean.includes('vercel.app') ||
        (!isProd && clean.includes('localhost'))
      ) {
        return clean;
      }
    }

    if (referer) {
      try {
        const parsed = new URL(referer);
        const refOrigin = `${parsed.protocol}//${parsed.host}`;
        if (
          refOrigin.includes('vercel.app') ||
          (!isProd && refOrigin.includes('localhost'))
        ) {
          return refOrigin;
        }
      } catch {}
    }

    // 3. Configured frontend URL
    const configured = this.configService.get<string>('app.frontendUrl');
    if (configured) {
      const clean = configured.trim().replace(/\/+$/, '');
      if (
        clean.includes('vercel.app') ||
        (!isProd && clean.includes('localhost'))
      ) {
        return clean;
      }
    }

    // 4. Default to live Vercel production deployment
    return isProd
      ? 'https://snapcart-fullstack.vercel.app'
      : 'http://localhost:3000';
  }

  // ============================================================
  // REGISTRATION
  // ============================================================
  @ApiOperation({ summary: 'Register a new user (customer)' })
  @ApiResponse({ status: 201, description: 'User registered successfully' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register')
  async registerUser(@Body(new ValidationPipe()) dto: RegisterUserDto) {
    return this.authService.registerUser(dto);
  }

  @ApiOperation({ summary: 'Register a new vendor' })
  @ApiResponse({ status: 201, description: 'Vendor registered successfully' })
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('register/vendor')
  async registerVendor(@Body(new ValidationPipe()) dto: RegisterVendorDto) {
    return this.authService.registerVendor(dto);
  }

  // ============================================================
  // SOCIAL AUTH (GOOGLE OAUTH)
  // ============================================================
  @ApiOperation({ summary: 'Initiate Google OAuth login' })
  @Get('google')
  googleAuth(
    @Req() req: any,
    @Res() res: Response,
    @Query('redirect') redirect?: string,
  ) {
    const clientId = this.configService.get<string>('google.clientId');
    const clientSecret = this.configService.get<string>('google.clientSecret');
    const isConfigured =
      Boolean(clientId) &&
      Boolean(clientSecret) &&
      !clientId?.includes('placeholder') &&
      !clientId?.includes('unconfigured') &&
      !clientSecret?.includes('placeholder') &&
      !clientSecret?.includes('unconfigured');

    const frontendUrl = this.resolveFrontendUrl(req);

    const safeRedirect =
      redirect && redirect.startsWith('/') && !redirect.startsWith('//')
        ? redirect
        : '/';

    const statePayload = Buffer.from(
      JSON.stringify({ origin: frontendUrl, path: safeRedirect }),
    ).toString('base64url');

    if (!isConfigured) {
      if (isProd) {
        return res.redirect(`${frontendUrl}/login?error=google_not_configured`);
      }

      const configuredEmail =
        this.configService.get<string>('smtp.user') ||
        'food.quickbite.delivery@gmail.com';
      this.renderGoogleDevConsentScreen(res, {
        configuredEmail,
        frontendUrl,
        redirectUrl: safeRedirect,
      });
      return;
    }

    const callbackURL = this.resolveCallbackUrl(req);
    this.logger.log(
      `Initiating Google OAuth login with callbackURL: ${callbackURL}`,
    );

    return (passport.authenticate('google', {
      scope: ['email', 'profile'],
      state: statePayload,
      prompt: 'select_account',
      callbackURL,
    } as any) as any)(req, res, (err: any) => {
      if (err) {
        this.logger.error(
          `❌ Google OAuth initiation failed: ${err?.message || err}`,
        );
        return res.redirect(`${frontendUrl}/login?error=google_auth_failed`);
      }
    });
  }

  @ApiOperation({ summary: 'Development Google OAuth mock callback' })
  @Post('google/dev-callback')
  async googleDevCallbackPost(
    @Body() body: any,
    @Req() req: any,
    @Res() res: Response,
  ) {
    if (isProd) {
      throw new ForbiddenException(
        'Google OAuth development sandbox is disabled in production',
      );
    }

    const frontendUrl = this.resolveFrontendUrl(req);

    const email = (body?.email || '').toLowerCase().trim();
    if (!email || !email.includes('@')) {
      return res.redirect(`${frontendUrl}/login?error=invalid_email`);
    }

    try {
      const meta = this.requestMeta(req);
      const profile = {
        googleId:
          body.googleId ||
          `dev_google_${Buffer.from(email).toString('hex').slice(0, 16)}`,
        email,
        name: body.name || email.split('@')[0],
        avatar:
          body.avatar ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(body.name || email)}&background=4285F4&color=fff`,
      };

      const result = await this.authService.validateGoogleUser(profile, meta);
      this.setAuthCookies(res, result.tokens);

      const targetUrl =
        body.redirect &&
        body.redirect.startsWith('/') &&
        !body.redirect.startsWith('//')
          ? body.redirect
          : '/';
      return res.redirect(`${frontendUrl}${targetUrl}`);
    } catch (error: any) {
      return res.redirect(
        `${frontendUrl}/login?error=${encodeURIComponent(error?.message || 'google_auth_failed')}`,
      );
    }
  }

  @ApiOperation({ summary: 'Development Google OAuth mock callback (GET)' })
  @Get('google/dev-callback')
  async googleDevCallbackGet(
    @Query() query: any,
    @Req() req: any,
    @Res() res: Response,
  ) {
    return this.googleDevCallbackPost(query, req, res);
  }

  @ApiOperation({ summary: 'Google OAuth callback' })
  @Get('google/callback')
  async googleAuthCallback(
    @Req() req: any,
    @Res() res: Response,
    @Query('state') state?: string,
    @Query('error') oauthError?: string,
  ) {
    let targetOrigin = this.resolveFrontendUrl(req);
    let targetPath = '/';

    if (state) {
      try {
        const decoded = JSON.parse(
          Buffer.from(state, 'base64url').toString('utf8'),
        );
        if (decoded.origin) {
          const cleanOrigin = decoded.origin.trim().replace(/\/+$/, '');
          if (
            cleanOrigin.includes('vercel.app') ||
            (!isProd && cleanOrigin.includes('localhost'))
          ) {
            targetOrigin = cleanOrigin;
          }
        }
        if (decoded.path && decoded.path.startsWith('/')) {
          targetPath = decoded.path;
        }
      } catch {
        if (state.startsWith('/') && !state.startsWith('//')) {
          targetPath = state;
        }
      }
    }

    if (isProd && targetOrigin.includes('localhost')) {
      targetOrigin = 'https://snapcart-fullstack.vercel.app';
    }

    targetOrigin = targetOrigin.replace(/\/+$/, '');
    targetPath = targetPath.startsWith('/') ? targetPath : `/${targetPath}`;
    const finalRedirectUrl = `${targetOrigin}${targetPath}`;

    if (oauthError) {
      const errParam =
        oauthError === 'access_denied'
          ? 'google_cancelled'
          : 'google_auth_failed';
      return res.redirect(`${targetOrigin}/login?error=${errParam}`);
    }

    const clientId = this.configService.get<string>('google.clientId');
    const clientSecret = this.configService.get<string>('google.clientSecret');
    const isConfigured =
      Boolean(clientId) &&
      Boolean(clientSecret) &&
      !clientId?.includes('placeholder') &&
      !clientSecret?.includes('placeholder');

    if (!isConfigured) {
      return res.redirect(`${targetOrigin}/login?error=google_not_configured`);
    }

    const callbackURL = this.resolveCallbackUrl(req);
    this.logger.log(
      `Exchanging Google OAuth code with callbackURL: ${callbackURL}`,
    );

    return new Promise<void>((resolve) => {
      let isSettled = false;
      const safeRedirect = (url: string) => {
        if (!isSettled && !res.headersSent) {
          isSettled = true;
          res.redirect(url);
        }
        resolve();
      };

      (passport.authenticate(
        'google',
        { session: false, callbackURL } as any,
        async (err: any, user: any) => {
          if (isSettled || res.headersSent) {
            return resolve();
          }

          if (err || !user) {
            this.logger.error(
              `❌ Google OAuth authentication failed: ${err?.message || 'No user profile received'}`,
            );
            return safeRedirect(`${targetOrigin}/login?error=google_auth_failed`);
          }

          try {
            const meta = this.requestMeta(req);
            const result = await this.authService.validateGoogleUser(user, meta);

            if (isSettled || res.headersSent) {
              return resolve();
            }

            this.setAuthCookies(res, result.tokens);

            this.logger.log(
              `✅ Google OAuth login successful for ${user.email} (ID: ${result.user?.id})`,
            );

            return safeRedirect(finalRedirectUrl);
          } catch (error: any) {
            this.logger.error(
              `❌ Google OAuth user validation error: ${error?.message || String(error)}`,
            );
            return safeRedirect(
              `${targetOrigin}/login?error=${encodeURIComponent(error?.message || 'google_auth_failed')}`,
            );
          }
        },
      ) as any)(req, res, (err: any) => {
        if (isSettled || res.headersSent) {
          return resolve();
        }
        if (err) {
          this.logger.error(
            `❌ Google OAuth middleware error: ${err?.message || String(err)}`,
          );
          return safeRedirect(`${targetOrigin}/login?error=google_auth_failed`);
        }
      });
    });
  }

  // ============================================================
  // GOOGLE DEV CONSENT SCREEN HELPER
  // ============================================================
  private renderGoogleDevConsentScreen(
    res: Response,
    opts: {
      configuredEmail: string;
      frontendUrl: string;
      redirectUrl: string;
    },
  ) {
    const { configuredEmail, frontendUrl, redirectUrl } = opts;
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign in with Google - SnapCart</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Roboto', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #f0f2f5;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: 24px;
      color: #202124;
    }
    .card {
      background: #ffffff;
      border: 1px solid #dadce0;
      border-radius: 8px;
      width: 100%;
      max-width: 460px;
      padding: 36px 32px 32px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.08);
    }
    .header {
      text-align: center;
      margin-bottom: 24px;
    }
    .google-logo {
      display: inline-block;
      margin-bottom: 14px;
    }
    h1 {
      font-size: 22px;
      font-weight: 500;
      color: #202124;
      margin-bottom: 6px;
    }
    .subtitle {
      font-size: 14px;
      color: #5f6368;
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      background: #e8f0fe;
      color: #1a73e8;
      font-size: 12px;
      font-weight: 500;
      padding: 4px 10px;
      border-radius: 12px;
      margin-top: 10px;
    }
    .account-list {
      list-style: none;
      margin-bottom: 20px;
    }
    .account-item {
      border: 1px solid #dadce0;
      border-radius: 8px;
      margin-bottom: 10px;
      transition: all 0.15s ease;
      cursor: pointer;
      overflow: hidden;
    }
    .account-item:hover {
      background: #f8f9fa;
      border-color: #1a73e8;
      box-shadow: 0 1px 4px rgba(26,115,232,0.15);
    }
    .account-btn {
      width: 100%;
      padding: 12px 14px;
      display: flex;
      align-items: center;
      gap: 12px;
      background: none;
      border: none;
      cursor: pointer;
      text-align: left;
      font-family: inherit;
    }
    .avatar {
      width: 38px;
      height: 38px;
      border-radius: 50%;
      background: #1a73e8;
      color: #fff;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 500;
      font-size: 16px;
      flex-shrink: 0;
    }
    .avatar.green { background: #0f9d58; }
    .acc-info { flex: 1; min-width: 0; }
    .acc-name {
      font-weight: 500;
      font-size: 14px;
      color: #202124;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .acc-email {
      font-size: 12px;
      color: #5f6368;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .custom-form {
      border: 1px dashed #dadce0;
      border-radius: 8px;
      padding: 14px;
      margin-bottom: 16px;
      background: #fafafa;
    }
    .form-group {
      margin-bottom: 10px;
    }
    .form-group label {
      display: block;
      font-size: 12px;
      font-weight: 500;
      color: #5f6368;
      margin-bottom: 4px;
    }
    .form-input {
      width: 100%;
      padding: 8px 10px;
      border: 1px solid #dadce0;
      border-radius: 4px;
      font-size: 13px;
      font-family: inherit;
      outline: none;
    }
    .form-input:focus {
      border-color: #1a73e8;
      box-shadow: 0 0 0 2px rgba(26,115,232,0.2);
    }
    .btn-submit {
      width: 100%;
      background: #1a73e8;
      color: #fff;
      border: none;
      padding: 9px 14px;
      border-radius: 4px;
      font-weight: 500;
      font-size: 13px;
      cursor: pointer;
      font-family: inherit;
    }
    .btn-submit:hover {
      background: #1557b0;
    }
    .instructions {
      border-top: 1px solid #e0e0e0;
      padding-top: 14px;
      margin-top: 14px;
    }
    .instructions summary {
      font-size: 13px;
      font-weight: 500;
      color: #1a73e8;
      cursor: pointer;
      outline: none;
      user-select: none;
    }
    .instructions-content {
      margin-top: 10px;
      background: #f8f9fa;
      border-radius: 6px;
      padding: 10px 12px;
      font-size: 12px;
      line-height: 1.5;
      color: #3c4043;
    }
    .instructions-content ol {
      margin-left: 16px;
      margin-top: 6px;
    }
    .instructions-content code {
      background: #e8eaed;
      padding: 1px 4px;
      border-radius: 3px;
      font-family: monospace;
      font-size: 11px;
    }
    .footer-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-top: 18px;
    }
    .cancel-link {
      font-size: 13px;
      color: #5f6368;
      text-decoration: none;
    }
    .cancel-link:hover {
      color: #202124;
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="google-logo">
        <svg width="36" height="36" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
        </svg>
      </div>
      <h1>Sign in with Google</h1>
      <p class="subtitle">to continue to <strong>SnapCart</strong></p>
      <div><span class="badge">🛠️ Local Development Sandbox</span></div>
    </div>

    <ul class="account-list">
      <li class="account-item">
        <form method="POST" action="/api/v1/auth/google/dev-callback">
          <input type="hidden" name="email" value="${configuredEmail}" />
          <input type="hidden" name="name" value="QuickBite Delivery" />
          <input type="hidden" name="redirect" value="${redirectUrl}" />
          <button type="submit" class="account-btn">
            <div class="avatar">Q</div>
            <div class="acc-info">
              <div class="acc-name">QuickBite Delivery (Store Owner)</div>
              <div class="acc-email">${configuredEmail}</div>
            </div>
          </button>
        </form>
      </li>

      <li class="account-item">
        <form method="POST" action="/api/v1/auth/google/dev-callback">
          <input type="hidden" name="email" value="alex.chen.dev@gmail.com" />
          <input type="hidden" name="name" value="Alex Chen" />
          <input type="hidden" name="redirect" value="${redirectUrl}" />
          <button type="submit" class="account-btn">
            <div class="avatar green">A</div>
            <div class="acc-info">
              <div class="acc-name">Alex Chen (Shopper Demo)</div>
              <div class="acc-email">alex.chen.dev@gmail.com</div>
            </div>
          </button>
        </form>
      </li>
    </ul>

    <details style="margin-bottom: 14px;">
      <summary style="font-size: 13px; color: #1a73e8; cursor: pointer; padding: 4px 0; user-select: none;">
        + Use a different Google account
      </summary>
      <form method="POST" action="/api/v1/auth/google/dev-callback" class="custom-form" style="margin-top: 8px;">
        <input type="hidden" name="redirect" value="${redirectUrl}" />
        <div class="form-group">
          <label>Full Name</label>
          <input type="text" name="name" required class="form-input" placeholder="e.g. Sarah Jenkins" value="Sarah Jenkins" />
        </div>
        <div class="form-group">
          <label>Google Email</label>
          <input type="email" name="email" required class="form-input" placeholder="e.g. sarah.jenkins@gmail.com" value="sarah.jenkins@gmail.com" />
        </div>
        <button type="submit" class="btn-submit">Sign in as Custom User</button>
      </form>
    </details>

    <div class="instructions">
      <details>
        <summary>⚙️ How to connect real Google Cloud credentials</summary>
        <div class="instructions-content">
          <p><strong>To activate live Google Sign-In with real Google accounts:</strong></p>
          <ol>
            <li>Visit the <a href="https://console.cloud.google.com/apis/credentials" target="_blank" style="color: #1a73e8;">Google Cloud Console</a>.</li>
            <li>Create an <strong>OAuth 2.0 Client ID</strong> (Web Application).</li>
            <li>Add Authorized redirect URI: <code>http://localhost:3001/api/v1/auth/google/callback</code>.</li>
            <li>Add your keys in <code>backend/.env</code>:
              <br><code>GOOGLE_CLIENT_ID=your_id.apps.googleusercontent.com</code>
              <br><code>GOOGLE_CLIENT_SECRET=GOCSPX-your_secret</code>
            </li>
          </ol>
          <p style="margin-top: 8px;">Once configured, clicking "Continue with Google" directly invokes Google's official OAuth servers.</p>
        </div>
      </details>
    </div>

    <div class="footer-actions">
      <a href="${frontendUrl}/login?error=google_cancelled" class="cancel-link">Cancel and return to Login</a>
    </div>
  </div>
</body>
</html>`;
    res.type('html').send(html);
  }

  // ============================================================
  // EMAIL VERIFICATION
  // ============================================================
  @ApiOperation({ summary: 'Verify email with code' })
  @ApiResponse({ status: 200, description: 'Email verified successfully' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('verify-email')
  async verifyEmail(
    @Body(new ValidationPipe()) dto: VerifyEmailDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.verifyEmail(dto.email, dto.code);
    this.setAuthCookies(res, result.tokens);
    return { message: result.message, user: result.user };
  }

  @ApiOperation({ summary: 'Resend verification code' })
  @ApiResponse({ status: 200, description: 'Verification code sent' })
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('resend-verification')
  async resendVerification(@Body() body: { email: string }) {
    return this.authService.resendVerificationCode(body.email);
  }

  // ============================================================
  // LOGIN / LOGOUT
  // ============================================================
  @ApiOperation({ summary: 'Login to the application' })
  @ApiResponse({ status: 200, description: 'Login successful' })
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('login')
  async login(
    @Body(new ValidationPipe()) dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.login(dto, this.requestMeta(req));
    this.setAuthCookies(res, result.tokens);
    return { message: result.message, user: result.user };
  }

  @SkipThrottle()
  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE];
    const result = await this.authService.refresh(
      rawRefreshToken,
      this.requestMeta(req),
    );
    this.setAuthCookies(res, result.tokens);
    return { user: result.user };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: Request & { user: { sub: number } }) {
    return this.authService.getCurrentUser(req.user.sub);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const rawRefreshToken = req.cookies?.[REFRESH_COOKIE];
    const result = await this.authService.logout(rawRefreshToken);
    this.clearAuthCookies(res);
    return result;
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutAll(
    @Req() req: Request & { user: { sub: number } },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.authService.logoutAll(req.user.sub);
    this.clearAuthCookies(res);
    return result;
  }

  // ============================================================
  // PASSWORD MANAGEMENT
  // ============================================================
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Req() req: Request & { user: { sub: number } },
    @Body(new ValidationPipe()) dto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(
      req.user.sub,
      dto.currentPassword,
      dto.newPassword,
    );
  }

  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @Post('forgot-password')
  async forgotPassword(@Body() body: { email: string }) {
    return this.authService.requestPasswordReset(body.email);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('verify-reset-code')
  async verifyResetCode(@Body(new ValidationPipe()) dto: VerifyResetCodeDto) {
    return this.authService.verifyResetCode(dto.email, dto.code);
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('reset-password')
  async resetPassword(@Body(new ValidationPipe()) dto: ResetPasswordDto) {
    return this.authService.resetPassword(
      dto.verificationToken,
      dto.newPassword,
    );
  }

  // ============================================================
  // VENDOR MANAGEMENT (Admin/SuperAdmin only)
  // ============================================================
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Get('vendors/pending')
  async getPendingVendors() {
    return this.authService.getPendingVendors();
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch('vendors/:id/approve')
  async approveVendor(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: Request & { user: { sub: number } },
  ) {
    return this.authService.approveVendor(id, req.user.sub);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.SUPER_ADMIN)
  @Patch('vendors/:id/reject')
  async rejectVendor(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { reason?: string },
    @Req() req: Request & { user: { sub: number } },
  ) {
    return this.authService.rejectVendor(id, req.user.sub, body.reason);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  @Post('vendors/resubmit')
  @ApiOperation({ summary: 'Vendor resubmits rejected KYC application' })
  async resubmitVendorApplication(
    @Req() req: Request & { user: { sub: number } },
    @Body() body?: {
      businessName?: string;
      phoneNumber?: string;
      address?: string;
      businessRegistration?: string;
      businessDescription?: string;
    },
  ) {
    return this.authService.resubmitVendorApplication(req.user.sub, body);
  }

  // ============================================================
  // TWO-FACTOR AUTHENTICATION (2FA) ENDPOINTS
  // ============================================================

  // ✅ NEW: Request 2FA code via email
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('2fa/request-code')
  @ApiOperation({ summary: 'Request 2FA code via email' })
  @ApiResponse({ status: 200, description: 'Code sent successfully' })
  async requestTwoFactorCode(@Req() req: Request & { user: { sub: number } }) {
    return this.twoFactorService.sendTwoFactorCode(req.user.sub);
  }

  // ✅ NEW: Verify 2FA code from email
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('2fa/verify-email')
  @ApiOperation({ summary: 'Verify 2FA code from email' })
  @ApiResponse({ status: 200, description: 'Code verified successfully' })
  async verifyEmailOTP(
    @Req() req: Request & { user: { sub: number } },
    @Body(new ValidationPipe()) dto: VerifyTwoFactorDto,
  ) {
    const valid = await this.twoFactorService.verifyEmailOTP(
      req.user.sub,
      dto.token,
    );
    return { valid, message: '2FA code verified successfully' };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('2fa/generate')
  @ApiOperation({ summary: 'Generate 2FA secret and QR code' })
  @ApiResponse({ status: 200, description: 'Secret and QR code generated' })
  async generateTwoFactor(@Req() req: Request & { user: { sub: number } }) {
    return this.twoFactorService.generateSecret(req.user.sub);
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('2fa/enable')
  @ApiOperation({ summary: 'Enable 2FA with TOTP verification' })
  @ApiResponse({ status: 200, description: '2FA enabled successfully' })
  async enableTwoFactor(
    @Req() req: Request & { user: { sub: number } },
    @Body(new ValidationPipe()) dto: VerifyTwoFactorDto,
  ) {
    const result = await this.twoFactorService.verifyAndEnable(
      req.user.sub,
      dto.token,
    );
    return {
      message: '2FA enabled successfully',
      backupCodes: result.backupCodes,
    };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('2fa/verify')
  @ApiOperation({ summary: 'Verify 2FA token (for login flow)' })
  @ApiResponse({ status: 200, description: 'Token validation result' })
  async verifyTwoFactor(
    @Req() req: Request & { user: { sub: number } },
    @Body(new ValidationPipe()) dto: VerifyTwoFactorDto,
  ) {
    const valid = await this.twoFactorService.verifyToken(
      req.user.sub,
      dto.token,
    );
    return { valid };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('2fa/disable')
  @ApiOperation({ summary: 'Disable 2FA' })
  @ApiResponse({ status: 200, description: '2FA disabled successfully' })
  async disableTwoFactor(
    @Req() req: Request & { user: { sub: number } },
    @Body(new ValidationPipe()) dto: DisableTwoFactorDto,
  ) {
    await this.twoFactorService.disable(req.user.sub, dto.token);
    return { message: '2FA disabled successfully' };
  }

  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Post('2fa/backup-codes')
  @ApiOperation({ summary: 'Regenerate backup codes' })
  @ApiResponse({ status: 200, description: 'New backup codes generated' })
  async regenerateBackupCodes(@Req() req: Request & { user: { sub: number } }) {
    const codes = await this.twoFactorService.generateBackupCodes(req.user.sub);
    return { backupCodes: codes };
  }
}
