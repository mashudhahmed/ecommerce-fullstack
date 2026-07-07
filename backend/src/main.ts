// src/main.ts
import { ValidationPipe, Logger, ClassSerializerInterceptor } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet'; // ✅ Added security
import compression from 'compression'; // ✅ Added compression
import cookieParser from 'cookie-parser'; // ✅ FIX: required for req.cookies to be populated

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });

  // ✅ FIX: Without this, req.cookies is always undefined, so
  // JwtStrategy's extractFromCookieOrHeader() can never read the
  // access_token / refresh_token cookies — every authenticated
  // request 401s even though the cookies were set correctly by
  // the browser. Must be registered before any guard runs.
  app.use(cookieParser());

  const configService = app.get(ConfigService);

  // ✅ Security Headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
      },
    },
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  }));

  // ✅ Compression
  app.use(compression({
    threshold: 1024, // Compress responses > 1KB
    filter: (req, res) => {
      // Don't compress SSE or WebSocket connections
      if (req.headers['upgrade'] === 'websocket') return false;
      return compression.filter(req, res);
    },
  }));

  // CORS
  const corsOrigin = configService.get('cors.origin') || ['http://localhost:3000'];
  app.enableCors({
    origin: corsOrigin,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
    credentials: true,
    maxAge: 3600,
  });

  // Global prefix - ✅ Using config
  const apiPrefix = configService.get('api.prefix') || 'api';
  const apiVersion = configService.get('api.version') || 'v1';
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
    new ClassSerializerInterceptor(app.get(Reflector)),
    new ResponseInterceptor(),
  );

  // Filters
  app.useGlobalFilters(new HttpExceptionFilter());

  // Swagger
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

  const port = Number(process.env.PORT) || 3001;
  await app.listen(port);

  logger.log(`🚀 Server running at http://localhost:${port}`);
  logger.log(`📚 API: http://localhost:${port}/${apiPrefix}/${apiVersion}`);
  logger.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
  logger.log(`🔒 Security: ${helmet.name} enabled`);
}

bootstrap();