import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, Profile } from 'passport-google-oauth20';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(private readonly configService: ConfigService) {
    const isProd =
      process.env.NODE_ENV === 'production' ||
      Boolean(process.env.RENDER) ||
      Boolean(process.env.RENDER_EXTERNAL_URL);
    const defaultCallback = isProd
      ? 'https://snapcart-backend-kaf4.onrender.com/api/v1/auth/google/callback'
      : 'http://localhost:3001/api/v1/auth/google/callback';

    const configuredCallback = configService.get<string>('google.callbackUrl');
    const validCallback =
      configuredCallback && !configuredCallback.includes('vercel.app')
        ? configuredCallback
        : defaultCallback;

    super({
      clientID:
        configService.get<string>('google.clientId') ||
        'google-client-id-unconfigured',
      clientSecret:
        configService.get<string>('google.clientSecret') ||
        'google-client-secret-unconfigured',
      callbackURL: validCallback,
      scope: ['email', 'profile'],
    });
  }

  async validate(
    accessToken: string,
    refreshToken: string,
    profile: Profile,
  ): Promise<any> {
    const { id, displayName, name, emails, photos } = profile;
    const resolvedName =
      displayName?.trim() ||
      `${name?.givenName || ''} ${name?.familyName || ''}`.trim() ||
      emails?.[0]?.value?.split('@')[0] ||
      'User';

    return {
      googleId: id,
      email: (emails?.[0]?.value || '').toLowerCase().trim(),
      name: resolvedName,
      avatar: photos?.[0]?.value,
      accessToken,
    };
  }
}
