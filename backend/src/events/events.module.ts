// src/events/events.module.ts
import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { EventsGateway } from './events.gateway';
import { EventsService } from './events.service';

@Global() // ✅ Makes it available everywhere
@Module({
  imports: [
    ConfigModule,
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
  providers: [EventsGateway, EventsService],
  exports: [EventsGateway, EventsService], // ✅ Export both
})
export class EventsModule {}