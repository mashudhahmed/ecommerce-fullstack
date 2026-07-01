import {
  ValidationPipe,
  Logger,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);

  // Read PORT from .env
  const port = Number(process.env.PORT) || 3001;

  // Enable CORS
  app.enableCors({
    origin: [
      'http://localhost:3000', // Next.js Frontend
      'http://localhost:3001',
    ],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    credentials: true,
    maxAge: 3600,
  });

  // Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Serializer
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(app.get(Reflector)),
  );

  // Global API Prefix
  app.setGlobalPrefix('api');

  // Start Server
  await app.listen(port);

  logger.log(`🚀 Server running at http://localhost:${port}`);
  logger.log(`📚 API: http://localhost:${port}/api`);
  logger.log(
    `🌍 Environment: ${process.env.NODE_ENV || 'development'}`,
  );
}

bootstrap();