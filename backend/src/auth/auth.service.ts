import { Injectable, HttpException, HttpStatus, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { CreateUserDto } from './dto/register.dto';
import { User } from '../user/user.entity';
import { MailerService } from '../mailer/mailer.service';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private userRepo: Repository<User>,
    private jwtService: JwtService,
    private mailerService: MailerService,
  ) {}

  // ✅ MODIFIED: Register with email verification (FIXED)
  async register(dto: CreateUserDto) {
    const exists = await this.userRepo.findOne({ where: { email: dto.email } });
    if (exists) throw new HttpException('Email already used', HttpStatus.BAD_REQUEST);

    const hash = await bcrypt.hash(dto.password, 10);
    
    // ✅ FIX: Generate code first to ensure it's not null
    const verificationCode = this.generateSixDigitCode();
    
    // Create user but don't activate yet
    const user = this.userRepo.create({ 
      ...dto, 
      password: hash,
      isVerified: false,
      verificationCode: verificationCode, // ✅ Now guaranteed to be string
      verificationCodeExpiry: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
    });
    
    await this.userRepo.save(user);

    // Send verification email
    try {
      await this.mailerService.sendVerificationEmail(user.email, verificationCode, user.name);
      console.log('Verification email sent to:', user.email);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
    }

    return { 
      message: 'Please check your email for activation code.',
      requiresVerification: true
    };
  }

  // ✅ NEW: Verify email with 6-digit code
  async verifyEmail(email: string, code: string) {
  console.log('🎯 SERVICE: Starting email verification');
  
  try {
    const user = await this.userRepo.findOne({ 
      where: { email, verificationCode: code }
    });

    console.log('🔍 SERVICE: User found for verification:', user ? 'YES' : 'NO');
    
    if (!user) {
      console.log('❌ SERVICE: No user found with this email and code');
      throw new BadRequestException('Invalid verification code');
    }

    // ✅ ADD NULL CHECK
    if (!user.verificationCodeExpiry) {
      console.log('❌ SERVICE: No verification code expiry found');
      throw new BadRequestException('Invalid verification code');
    }

    // Check if code expired
    const now = new Date();
    if (user.verificationCodeExpiry < now) {
      console.log('❌ SERVICE: Verification code expired');
      throw new BadRequestException('Verification code expired');
    }

    console.log('✅ SERVICE: Email verification successful');

    // Activate user account
    user.isVerified = true;
    user.verificationCode = '';
    user.verificationCodeExpiry = null as any;
    
    await this.userRepo.save(user);

    // Send welcome email after verification
    try {
      await this.mailerService.sendWelcomeEmail(user.email, user.name);
      console.log('Welcome email sent to verified user:', user.email);
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
    }

    // Generate login token
    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return { 
      message: 'Email verified successfully! Your account is now active.',
      access_token: token
    };

  } catch (error) {
    console.error('💥 SERVICE CATCH: Error in verifyEmail:', error);
    throw error;
  }
}

  // ✅ NEW: Resend verification code (FIXED)
  async resendVerificationCode(email: string) {
    const user = await this.userRepo.findOne({ 
      where: { email, isVerified: false } 
    });
    
    if (!user) {
      return { message: 'If the account exists and is not verified, a new code has been sent' };
    }

    // ✅ FIX: Generate new code first to ensure it's not null
    const newVerificationCode = this.generateSixDigitCode();
    user.verificationCode = newVerificationCode;
    user.verificationCodeExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    
    await this.userRepo.save(user);

    try {
      await this.mailerService.sendVerificationEmail(user.email, newVerificationCode, user.name);
      console.log('Resent verification code to:', user.email);
      return { message: 'Verification code sent successfully' };
    } catch (emailError) {
      console.error('Failed to resend verification code:', emailError);
      throw new HttpException('Failed to send verification code', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ✅ UPDATED: Login with verification check
  async login(email: string, password: string) {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) throw new UnauthorizedException('Invalid credentials');

    // ✅ Check if user is verified
    if (!user.isVerified) {
      throw new UnauthorizedException('Please verify your email before logging in. Check your email for verification code.');
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new UnauthorizedException('Invalid credentials');

    const token = this.jwtService.sign({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    // Send login notification email
    try {
      await this.mailerService.sendLoginNotification(user.email, user.name);
      console.log('Login notification sent to:', user.email);
    } catch (emailError) {
      console.error('Failed to send login notification:', emailError);
    }

    return { access_token: token };
  }

  async createAdmin(dto: { name: string; email: string; password: string }) {
    const exists = await this.userRepo.findOne({ where: { email: dto.email } });
    if (exists) throw new HttpException('Email already used', HttpStatus.BAD_REQUEST);

    const hash = await bcrypt.hash(dto.password, 10);
    const admin = this.userRepo.create({
      name: dto.name,
      email: dto.email,
      password: hash,
      role: 'admin',
      isVerified: true, // Auto-verify admin accounts
    });
    await this.userRepo.save(admin);

    // Send admin welcome email
    try {
      await this.mailerService.sendWelcomeEmail(admin.email, admin.name);
      console.log('Admin welcome email sent to:', admin.email);
    } catch (emailError) {
      console.error('Failed to send admin welcome email:', emailError);
    }

    return { message: 'Admin created successfully' };
  }

  async listAllUsers() {
    return this.userRepo.find();
  }

  async deleteUser(id: number) {
    const user = await this.userRepo.findOne({ where: { id } });
    if (!user) throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    
    const userEmail = user.email;
    const userName = user.name;
    await this.userRepo.remove(user);

    // Send account deletion email
    try {
      await this.mailerService.sendAccountDeletionEmail(userEmail, userName);
      console.log('Account deletion email sent to:', userEmail);
    } catch (emailError) {
      console.error('Failed to send deletion email:', emailError);
    }

    return { message: 'User deleted successfully' };
  }

  // ✅ STEP 1: Request password reset with 6-digit code
  async requestPasswordReset(email: string) {
    const user = await this.userRepo.findOne({ where: { email } });
    if (!user) {
      // Don't reveal if email exists for security
      return { message: 'If the email exists, a reset code has been sent' };
    }

    // Generate 6-digit code
    const resetCode = this.generateSixDigitCode();
    user.resetCode = resetCode;
    user.resetCodeExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiry
    
    await this.userRepo.save(user);

    try {
      await this.mailerService.sendPasswordResetCode(user.email, resetCode, user.name);
      console.log('Password reset code sent to:', user.email);
      return { message: 'Password reset code sent successfully' };
    } catch (emailError) {
      console.error('Failed to send reset code:', emailError);
      throw new HttpException('Failed to send reset code', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ✅ STEP 2: Verify the 6-digit code (FIXED VERSION)
  async verifyResetCode(email: string, code: string) {
    console.log('🎯 SERVICE: Starting verifyResetCode');
    
    try {
      // Step 1: Basic validation
      if (!email || !code) {
        throw new BadRequestException('Email and code are required');
      }
      
      console.log('🔍 SERVICE: Looking for user with email:', email, 'and code:', code);

      // Step 2: Find user
      const user = await this.userRepo.findOne({
        where: { email: email }
      });

      console.log('🔍 SERVICE: User found:', user ? 'YES' : 'NO');
      
      if (!user) {
        console.log('❌ SERVICE: No user found with this email');
        throw new BadRequestException('Invalid code');
      }

      console.log('🔍 SERVICE: User resetCode:', user.resetCode);
      console.log('🔍 SERVICE: User resetCodeExpiry:', user.resetCodeExpiry);

      // Step 3: Check if codes match
      if (user.resetCode !== code) {
        console.log('❌ SERVICE: Code mismatch');
        console.log('   - Expected:', user.resetCode);
        console.log('   - Received:', code);
        throw new BadRequestException('Invalid code');
      }

      // Step 4: Check expiry
      const now = new Date();
      if (!user.resetCodeExpiry || user.resetCodeExpiry < now) {
        console.log('❌ SERVICE: Code expired or no expiry date');
        throw new BadRequestException('Code expired');
      }

      console.log('✅ SERVICE: Code is valid!');

      // ✅ FIX: Use shorter token (6 characters max)
      const verificationToken = Math.random().toString(36).substring(2, 8).toUpperCase();
      console.log('🔑 SERVICE: Generated token:', verificationToken);

      // Step 6: Update user
      user.resetCode = verificationToken;
      user.resetCodeExpiry = new Date(now.getTime() + 10 * 60 * 1000); // 10 minutes
      
      console.log('💾 SERVICE: Saving user...');
      await this.userRepo.save(user);
      console.log('✅ SERVICE: User saved successfully');

      // Step 7: Return success
      return { 
        message: 'Code verified successfully',
        verificationToken: verificationToken 
      };

    } catch (error) {
      console.error('💥 SERVICE CATCH: Error in verifyResetCode:');
      console.error('   - Error:', error);
      console.error('   - Message:', error.message);
      console.error('   - Stack:', error.stack);
      throw error;
    }
  }

  // ✅ STEP 3: Reset password with verification token
  async resetPassword(verificationToken: string, newPassword: string) {
    const user = await this.userRepo.findOne({
      where: {
        resetCode: verificationToken,
        resetCodeExpiry: MoreThan(new Date()),
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification');
    }

    // Hash new password
    const hash = await bcrypt.hash(newPassword, 10);
    user.password = hash;
    
    // Clear reset fields
    user.resetCode = null as any;
    user.resetCodeExpiry = null as any;
    
    await this.userRepo.save(user);

    // Send password changed confirmation
    try {
      await this.sendPasswordChangedConfirmation(user.email, user.name);
    } catch (emailError) {
      console.error('Failed to send password changed email:', emailError);
    }

    return { message: 'Password reset successfully' };
  }

  // ✅ Generate 6-digit code (000000 to 999999)
  private generateSixDigitCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  // ✅ Send password changed confirmation
  private async sendPasswordChangedConfirmation(email: string, userName: string) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Password Changed Successfully</h2>
        <p>Hello ${userName},</p>
        <p>Your password has been successfully changed.</p>
        <div style="background: #f9f9f9; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>Change Date:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <p>If you didn't make this change, please contact support immediately.</p>
        <div style="margin-top: 20px; padding: 15px; background: #fff3cd; border-radius: 5px;">
          <p style="margin: 0; color: #856404;">Keep your account secure!</p>
        </div>
      </div>
    `;

    await this.mailerService.sendCustomEmail(
      email,
      'Password Changed Successfully',
      html
    );
  }
}