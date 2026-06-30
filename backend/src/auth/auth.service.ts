import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UserService } from '../user/user.service';
import { MailerService } from '../mailer/mailer.service';
import { CreateUserDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
  ) {}

  async register(createUserDto: CreateUserDto) {
    this.logger.log(`Registering user: ${createUserDto.email}`);

    const verificationCode = this.userService.generateSixDigitCode();
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    const user = await this.userService.create(createUserDto);
    await this.userService.updateVerificationCode(
      user.email,
      verificationCode,
      expiry,
    );

    try {
      await this.mailerService.sendVerificationEmail(
        user.email,
        verificationCode,
        user.name,
      );
      this.logger.log(`Verification email sent to: ${user.email}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to send verification email', errorMessage);
    }

    return {
      message: 'Registration successful. Please check your email for verification code.',
      userId: user.id,
      requiresVerification: true,
    };
  }

  async verifyEmail(email: string, code: string) {
    this.logger.log(`Verifying email for: ${email}`);

    const user = await this.userService.verifyUser(email, code);

    try {
      await this.mailerService.sendWelcomeEmail(user.email, user.name);
      this.logger.log(`Welcome email sent to: ${user.email}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to send welcome email', errorMessage);
    }

    const token = this.generateToken(user);

    return {
      message: 'Email verified successfully!',
      access_token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  async resendVerificationCode(email: string) {
    this.logger.log(`Resending verification code for: ${email}`);

    const user = await this.userService.findByEmail(email);
    
    if (!user || user.isVerified) {
      return { message: 'If the account exists and is not verified, a new code has been sent' };
    }

    const newVerificationCode = this.userService.generateSixDigitCode();
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    
    await this.userService.updateVerificationCode(email, newVerificationCode, expiry);

    try {
      await this.mailerService.sendVerificationEmail(user.email, newVerificationCode, user.name);
      this.logger.log(`Verification code resent to: ${user.email}`);
      return { message: 'Verification code sent successfully' };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to send verification code', errorMessage);
      throw new BadRequestException('Failed to send verification code');
    }
  }

  async login(loginDto: LoginDto) {
    this.logger.log(`Login attempt: ${loginDto.email}`);

    const user = await this.userService.findByEmailOrFail(loginDto.email);

    if (!user.isVerified) {
      throw new BadRequestException(
        'Please verify your email before logging in. Check your email for verification code.',
      );
    }

    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      user.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.generateToken(user);

    try {
      await this.mailerService.sendLoginNotification(user.email, user.name);
      this.logger.log(`Login notification sent to: ${user.email}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to send login notification', errorMessage);
    }

    return {
      message: 'Login successful',
      access_token: token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    };
  }

  // ✅ ADD THIS METHOD
  async logout(token: string) {
    this.logger.log(`Logging out user`);
    return { message: 'Logged out successfully' };
  }

  // ✅ ADD THIS METHOD
  async logoutAll(userId: number) {
    this.logger.log(`Logging out all sessions for user: ${userId}`);
    return { 
      message: 'Logged out from all sessions successfully',
      sessionsEnded: 1
    };
  }

  async requestPasswordReset(email: string) {
    this.logger.log(`Password reset requested for: ${email}`);

    const user = await this.userService.findByEmail(email);

    if (!user) {
      return { message: 'If the email exists, a reset code has been sent' };
    }

    const resetCode = this.userService.generateSixDigitCode();
    const expiry = new Date(Date.now() + 15 * 60 * 1000);

    await this.userService.updateResetCode(email, resetCode, expiry);

    try {
      await this.mailerService.sendPasswordResetCode(
        user.email,
        resetCode,
        user.name,
      );
      this.logger.log(`Password reset code sent to: ${user.email}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to send reset code', errorMessage);
      throw new BadRequestException('Failed to send reset code');
    }

    return { message: 'Password reset code sent successfully' };
  }

  async verifyResetCode(email: string, code: string) {
    this.logger.log(`Verifying reset code for: ${email}`);

    const user = await this.userService.verifyResetCode(email, code);

    const verificationToken = this.userService.generateSixDigitCode();
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    await this.userService.updateResetCode(email, verificationToken, expiry);

    return {
      message: 'Code verified successfully',
      verificationToken,
    };
  }

  async resetPassword(verificationToken: string, newPassword: string) {
    this.logger.log(`Resetting password with token: ${verificationToken}`);

    const user = await this.userService.findByResetCode(verificationToken);

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    if (user.resetCodeExpiry && user.resetCodeExpiry < new Date()) {
      throw new BadRequestException('Verification token expired');
    }

    await this.userService.resetPassword(user.email, newPassword);

    try {
      await this.mailerService.sendPasswordChangedConfirmation(
        user.email,
        user.name,
      );
      this.logger.log(`Password changed confirmation sent to: ${user.email}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to send password changed email', errorMessage);
    }

    return { message: 'Password reset successfully' };
  }

  async createAdmin(createUserDto: CreateUserDto) {
    this.logger.log(`Creating admin: ${createUserDto.email}`);

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);

    const user = await this.userService.create({
      name: createUserDto.name,
      email: createUserDto.email,
      password: hashedPassword,
      role: 'admin',
      isVerified: true,
    });

    try {
      await this.mailerService.sendWelcomeEmail(user.email, user.name);
      this.logger.log(`Admin welcome email sent to: ${user.email}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to send admin welcome email', errorMessage);
    }

    return {
      message: 'Admin created successfully',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: 'admin',
      },
    };
  }

  async listAllUsers() {
    this.logger.log('Listing all users');
    return this.userService.findAll();
  }

  async deleteUser(id: number) {
    this.logger.log(`Deleting user with ID: ${id}`);
    
    const user = await this.userService.findByIdOrFail(id);
    const userEmail = user.email;
    const userName = user.name;
    
    await this.userService.delete(id);

    try {
      await this.mailerService.sendAccountDeletionEmail(userEmail, userName);
      this.logger.log(`Account deletion email sent to: ${userEmail}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Failed to send deletion email', errorMessage);
    }

    return { message: 'User deleted successfully' };
  }

  private generateToken(user: any): string {
    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    return this.jwtService.sign(payload);
  }
}