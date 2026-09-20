import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { TwoFactorService } from './two-factor.service';

describe('AuthController', () => {
  let controller: AuthController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: {
            registerUser: jest.fn(),
            login: jest.fn(),
            verifyEmail: jest.fn(),
            refresh: jest.fn(),
            logout: jest.fn(),
            getCurrentUser: jest.fn(),
          },
        },
        {
          provide: TwoFactorService,
          useValue: {
            generateTotpSecret: jest.fn(),
            enableTwoFactor: jest.fn(),
            verifyTwoFactor: jest.fn(),
            disableTwoFactor: jest.fn(),
          },
        },
        {
          provide: require('@nestjs/config').ConfigService,
          useValue: {
            get: jest.fn((key: string) => {
              if (key === 'app.frontendUrl') return 'http://localhost:3002';
              if (key === 'google.clientId') return 'mock-client-id';
              if (key === 'google.clientSecret') return 'mock-client-secret';
              return null;
            }),
          },
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
