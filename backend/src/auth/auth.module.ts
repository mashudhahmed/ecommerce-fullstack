// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from '../user/user.entity';
import { UserModule } from '../user/user.module';
import { MailerModule } from '../mailer/mailer.module';
import { JwtStrategy } from './jwt.strategy';
import { RefreshToken } from './refresh-token.entity';
import { TokenBlacklist } from './token-blacklist.entity';
import { TokenBlacklistService } from './token-blacklist.service';
import { LoginAttempt } from './login-attempt.entity';
import { LoginAttemptService } from './login-attempt.service';
import { TwoFactor } from './two-factor.entity';
import { TwoFactorService } from './two-factor.service';
import { EventsModule } from '../events/events.module';   // ✅ Import EventsModule
import { MonitoringModule } from '../monitoring/monitoring.module';

@Module({
  imports: [
    UserModule,
    MailerModule,
    EventsModule, 
    MonitoringModule,
    TypeOrmModule.forFeature([
      User,
      RefreshToken,
      TokenBlacklist,
      LoginAttempt,
      TwoFactor,
    ]),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get('jwt.secret');
        if (!secret) {
          throw new Error('JWT_SECRET is not defined in environment variables');
        }
        return {
          secret,
          signOptions: {
            expiresIn: configService.get('jwt.expiresIn'),
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    TokenBlacklistService,
    LoginAttemptService,
    TwoFactorService,   // ✅ Added TwoFactorService
  ],
  exports: [
    AuthService,
    TokenBlacklistService,
    LoginAttemptService,
    TwoFactorService,
  ],
})
export class AuthModule {}