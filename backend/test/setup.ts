// test/setup.ts
import 'reflect-metadata';
import { Logger } from '@nestjs/common';

// Suppress logger output during tests
Logger.overrideLogger(['error', 'warn']);

// Mock environment variables
process.env.JWT_SECRET = 'test-jwt-secret-key-min-32-characters';
process.env.SUPERADMIN_EMAIL = 'admin@test.com';
process.env.SUPERADMIN_PASSWORD = 'TestPassword123!';
process.env.SMTP_HOST = 'localhost';
process.env.SMTP_USER = 'test@test.com';
process.env.SMTP_PASS = 'test-password';
process.env.DATABASE_HOST = 'localhost';
process.env.DATABASE_USER = 'test';
process.env.DATABASE_PASSWORD = 'test';
process.env.DATABASE_NAME = 'test_db';
process.env.PORT = '3001';
process.env.NODE_ENV = 'test';

// Add global afterEach
afterEach(() => {
  jest.clearAllMocks();
});
