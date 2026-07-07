// test/setup.ts
import { Logger } from '@nestjs/common';
import '@testing-library/jest-dom';

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

// Mock bcrypt
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('hashedPassword'),
  compare: jest.fn().mockResolvedValue(true),
  genSalt: jest.fn().mockResolvedValue('salt'),
}));

// Mock nodemailer
jest.mock('nodemailer', () => ({
  createTransport: jest.fn().mockReturnValue({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-message-id' }),
    close: jest.fn(),
  }),
}));

// Mock crypto
jest.mock('crypto', () => ({
  createHash: jest.fn().mockReturnValue({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn().mockReturnValue('hashed-token'),
  }),
  randomBytes: jest.fn().mockReturnValue(Buffer.from('random-bytes')),
  randomUUID: jest.fn().mockReturnValue('test-uuid'),
}));

// Mock @nestjs/config
jest.mock('@nestjs/config', () => ({
  ConfigService: jest.fn().mockImplementation(() => ({
    get: jest.fn().mockImplementation((key: string) => {
      const config: Record<string, unknown> = {
        'jwt.secret': 'test-jwt-secret',
        'jwt.expiresIn': '7d',
        'database.host': 'localhost',
        'database.port': 5434,
        'database.username': 'test',
        'database.password': 'test',
        'database.database': 'test_db',
        'email.host': 'localhost',
        'email.port': 587,
        'email.user': 'test@test.com',
        'email.pass': 'test-password',
        'superAdmin.email': 'admin@test.com',
        'superAdmin.password': 'TestPassword123!',
      };
      return config[key];
    }),
  })),
}));

// Add global afterEach
afterEach(() => {
  jest.clearAllMocks();
});