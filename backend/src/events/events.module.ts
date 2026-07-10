// src/events/events.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventsGateway } from './events.gateway';

@Module({
  imports: [
    // ✅ Import ConfigModule so ConfigService is available
    ConfigModule,

    // ✅ Import JwtModule for token verification
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const secret = configService.get<string>('jwt.secret');
        if (!secret) {
          throw new Error('JWT_SECRET is not defined in environment variables');
        }
        return {
          secret,
          signOptions: {
            expiresIn: configService.get<string>('jwt.expiresIn', '7d'),
          },
        };
      },
      inject: [ConfigService],
    }),
  ],
  providers: [EventsGateway],
  exports: [EventsGateway], // ✅ So other modules (OrdersModule, AuthModule) can use it
})
export class EventsModule {}