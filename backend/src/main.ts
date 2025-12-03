import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS if needed
  app.enableCors();
  
  // Global validation pipe
  app.useGlobalPipes(new ValidationPipe({ 
    whitelist: true,
    transform: true, // ← ENABLE TRANSFORMATION
    transformOptions: {
      enableImplicitConversion: true,
    },
    forbidNonWhitelisted: true,
  }));
  
  // Global class serializer interceptor (applies @Exclude() decorators)
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));
  
  await app.listen(3000);
  console.log('Server running on http://localhost:3000');
}
bootstrap();