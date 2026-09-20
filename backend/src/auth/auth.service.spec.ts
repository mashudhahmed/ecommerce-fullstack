import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UserService } from '../user/user.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MailerService } from '../mailer/mailer.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RefreshToken } from './refresh-token.entity';

const mockUserService = {
  findByEmail: jest.fn(),
  findByIdOrFail: jest.fn(),
  create: jest.fn(),
};

const mockJwtService = {
  sign: jest.fn().mockReturnValue('token'),
  verify: jest.fn(),
};

const mockConfigService = {
  get: jest.fn(),
};

const mockMailerService = {
  sendVerificationEmail: jest.fn(),
  sendWelcomeEmail: jest.fn(),
};

const mockRefreshTokenRepo = {
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  delete: jest.fn(),
};

import { LoginAttemptService } from './login-attempt.service';
import { EventsGateway } from '../events/events.gateway';
import { TwoFactorService } from './two-factor.service';
import { TwoFactor } from './two-factor.entity';

const mockLoginAttemptService = {
  recordAttempt: jest.fn(),
  isLockedOut: jest.fn().mockResolvedValue(false),
  getRemainingLockoutTime: jest.fn().mockResolvedValue(0),
};

const mockEventsGateway = {
  server: { emit: jest.fn() },
};

const mockTwoFactorService = {
  generateTotpSecret: jest.fn(),
  enableTwoFactor: jest.fn(),
  verifyTwoFactor: jest.fn(),
  disableTwoFactor: jest.fn(),
};

const mockTwoFactorRepo = {
  findOne: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  delete: jest.fn(),
};

describe('AuthService', () => {
  let service: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UserService,
          useValue: mockUserService,
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: MailerService,
          useValue: mockMailerService,
        },
        {
          provide: getRepositoryToken(RefreshToken),
          useValue: mockRefreshTokenRepo,
        },
        {
          provide: LoginAttemptService,
          useValue: mockLoginAttemptService,
        },
        {
          provide: EventsGateway,
          useValue: mockEventsGateway,
        },
        {
          provide: TwoFactorService,
          useValue: mockTwoFactorService,
        },
        {
          provide: getRepositoryToken(TwoFactor),
          useValue: mockTwoFactorRepo,
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
