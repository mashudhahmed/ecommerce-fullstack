import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { User } from '../user/user.entity';
import { UserModule } from 'src/user/user.module';
import { MailerModule } from '../mailer/mailer.module';
import { JwtStrategy } from './jwt.strategy';
import { ConfigModule } from '@nestjs/config';
import { TokenBlacklist } from './token-blacklist.entity';
import { TokenBlacklistService } from './token-blacklist.service';

@Module({
  imports: [
    ConfigModule.forRoot(),
    UserModule,
    TypeOrmModule.forFeature([User, TokenBlacklist]), // ✅ ADD TokenBlacklist
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'default_secret',
      signOptions: { expiresIn: Number(process.env.JWT_EXPIRES_IN) || '1d' },
    }),
    MailerModule,
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, TokenBlacklistService], // ✅ ADD TokenBlacklistService
  exports: [AuthService, TokenBlacklistService],
})
export class AuthModule {}