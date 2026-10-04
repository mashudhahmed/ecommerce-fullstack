// src/main.ts
import {
  ValidationPipe,
  Logger,
  ClassSerializerInterceptor,
} from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { DataSource } from 'typeorm';
import { NestExpressApplication } from '@nestjs/platform-express';
import * as path from 'path';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  app.set('trust proxy', 1);

  app.use(cookieParser());

  const configService = app.get(ConfigService);
  const reflector = app.get(Reflector);

  // Serve uploaded files statically
  const uploadDir =
    configService.get<string>('upload.directory') || './uploads';
  app.useStaticAssets(path.resolve(uploadDir), {
    prefix: '/uploads/',
  });

  // Security middleware
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          imgSrc: ["'self'", 'data:', 'https:'],
          scriptSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
    }),
  );

  app.use(
    compression({
      threshold: 1024,
      filter: (req, res) => {
        if (req.headers['upgrade'] === 'websocket') return false;
        return compression.filter(req, res);
      },
    }),
  );

  // Dynamic CORS configuration supporting multiple origins, subdomains, and stripping trailing slashes
  const rawCorsOrigins =
    configService.get<string[] | string>('cors.origin') || [];
  const configuredOrigins = (
    Array.isArray(rawCorsOrigins) ? rawCorsOrigins : [rawCorsOrigins]
  )
    .map((o) => (typeof o === 'string' ? o.trim().replace(/\/+$/, '') : ''))
    .filter(Boolean);

  const defaultOrigins = [
    'https://snapcart-fullstack.vercel.app',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:3002',
  ];

  const allowedOriginsSet = new Set([...defaultOrigins, ...configuredOrigins]);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) {
        return callback(null, true);
      }

      const normalizedOrigin = origin.trim().replace(/\/+$/, '');

      // Check configured origins
      if (allowedOriginsSet.has(normalizedOrigin)) {
        return callback(null, true);
      }

      // Allow any Vercel domain (*.vercel.app)
      if (/^https:\/\/[a-zA-Z0-9_\-]+\.vercel\.app$/.test(normalizedOrigin)) {
        return callback(null, true);
      }

      // Allow localhost with any port
      if (
        /^https?:\/\/(localhost|127\.0\.0\.1)(:[0-9]+)?$/.test(normalizedOrigin)
      ) {
        return callback(null, true);
      }

      logger.warn(`CORS rejected for origin: ${origin}`);
      return callback(null, false);
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS', 'HEAD'],
    credentials: true,
    exposedHeaders: [
      'idempotency-key',
      'Idempotency-Key',
      'Content-Range',
      'X-Total-Count',
    ],
    maxAge: 86400,
  });

  // API prefix
  const apiPrefix = configService.get<string>('api.prefix') || 'api';
  const apiVersion = configService.get<string>('api.version') || 'v1';
  app.setGlobalPrefix(`${apiPrefix}/${apiVersion}`);

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

  // Interceptors
  app.useGlobalInterceptors(
    new ClassSerializerInterceptor(reflector),
    new ResponseInterceptor(reflector),
  );

  // Global exception filter
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger documentation
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('E-Commerce API')
      .setDescription('Production Grade E-Commerce Backend API')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup(`${apiPrefix}/${apiVersion}/docs`, app, document);
  }

  // Graceful shutdown
  app.enableShutdownHooks();

  // Start server
  const port = Number(process.env.PORT) || 3001;
  await app.listen(port, '0.0.0.0');

  logger.log(`Server running at http://localhost:${port}`);
  logger.log(`API: http://localhost:${port}/${apiPrefix}/${apiVersion}`);
  logger.log(`Environment: ${process.env.NODE_ENV || 'development'}`);

  try {
    const dataSource = app.get(DataSource);
    if (dataSource?.isInitialized) {
      logger.log('Database connection established');
    }
  } catch {
    logger.debug('DataSource not available in this context');
  }
}

bootstrap();
