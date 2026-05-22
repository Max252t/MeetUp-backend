import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';
import Redis from 'ioredis';
import { v4 as uuidv4 } from 'uuid';
import { hashPassword, verifyPassword, signAccessToken } from '@meetup/crypto';
import { JWT_CONSTANTS, REDIS_KEYS } from '@meetup/shared-config';
import { AuthRepository } from './auth.repository';
import { AuthPublisher } from './events/auth.publisher';
import { REDIS_CLIENT } from '../redis/redis.module';
import { AuthEnv } from '../../config/auth.config';
import { createHmac } from 'crypto';
import jwt from 'jsonwebtoken';

const OTP_TTL_MIN = 10;
const OTP_MAX_ATTEMPTS = 5;
const REFRESH_EXPIRY_DAYS = 30;

@Injectable()
export class AuthService {
  constructor(
    private readonly repo: AuthRepository,
    private readonly publisher: AuthPublisher,
    private readonly config: ConfigService<AuthEnv>,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async register(email: string, password: string, displayName: string, phone?: string) {
    const existing = await this.repo.findUserByEmail(email);
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await hashPassword(password);
    const user = await this.repo.createUser({ email, passwordHash, phone });

    const code = this.generateOtp();
    await this.repo.createOtp(user.id, 'registration', code, OTP_TTL_MIN);

    await this.repo.createAuditLog({ userId: user.id, event: 'USER_REGISTERED' });

    // In production: send OTP via email/SMS provider
    // For dev: return in response (remove in prod)
    return { userId: user.id, message: 'OTP sent', _devOtp: process.env.NODE_ENV !== 'production' ? code : undefined };
  }

  async verifyOtp(email: string, code: string) {
    const user = await this.repo.findUserByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const attemptsKey = REDIS_KEYS.OTP_ATTEMPTS(user.id);
    const attempts = await this.redis.incr(attemptsKey);
    if (attempts === 1) await this.redis.expire(attemptsKey, OTP_TTL_MIN * 60);
    if (attempts > OTP_MAX_ATTEMPTS) throw new BadRequestException('Too many OTP attempts');

    const otp = await this.repo.findValidOtp(user.id, 'registration', code);
    if (!otp) throw new BadRequestException('Invalid or expired OTP');

    await this.repo.useOtp(otp.id);
    await this.repo.markUserVerified(user.id);
    await this.redis.del(attemptsKey);

    await this.publisher.publishUserRegistered({
      userId: user.id,
      email,
      registeredAt: new Date().toISOString(),
    });

    await this.repo.createAuditLog({ userId: user.id, event: 'EMAIL_VERIFIED' });

    return this.issueTokenPair(user.id, email);
  }

  async login(email: string, password: string, ipAddress?: string) {
    const user = await this.repo.findUserByEmail(email);
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const valid = await verifyPassword(user.passwordHash, password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    if (!user.isVerified) throw new UnauthorizedException('Email not verified');

    await this.repo.createAuditLog({ userId: user.id, event: 'LOGIN', ipAddress });

    return this.issueTokenPair(user.id, email);
  }

  async refresh(token: string) {
    const stored = await this.repo.findRefreshToken(token);
    if (!stored) throw new UnauthorizedException('Invalid refresh token');

    if (stored.usedAt) {
      // Reuse detected — invalidate entire family
      await this.repo.invalidateFamily(stored.family);
      throw new UnauthorizedException('Refresh token reuse detected');
    }

    if (stored.expiresAt < new Date()) throw new UnauthorizedException('Refresh token expired');

    await this.repo.markRefreshTokenUsed(stored.id);

    const user = await this.repo.findUserById(stored.userId);
    if (!user) throw new UnauthorizedException('User not found');

    return this.issueTokenPair(user.id, user.email, stored.family);
  }

  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      const stored = await this.repo.findRefreshToken(refreshToken);
      if (stored) await this.repo.invalidateFamily(stored.family);
    }
    await this.redis.del(REDIS_KEYS.SESSION(userId));
    await this.repo.createAuditLog({ userId, event: 'LOGOUT' });
  }

  async deleteAccount(userId: string) {
    const user = await this.repo.findUserById(userId);
    if (!user) throw new BadRequestException('User not found');

    await this.repo.softDeleteUser(userId);
    await this.redis.del(REDIS_KEYS.SESSION(userId));

    await this.publisher.publishUserDeleted({
      userId,
      deletedAt: new Date().toISOString(),
    });

    await this.repo.createAuditLog({ userId, event: 'ACCOUNT_DELETED' });
  }

  private async issueTokenPair(userId: string, email: string, existingFamily?: string) {
    const privateKey = this.config.get<string>('JWT_PRIVATE_KEY')!;
    const jti = uuidv4();

    const accessToken = signAccessToken(
      { sub: userId, email, jti },
      privateKey,
      JWT_CONSTANTS.ACCESS_TOKEN_TTL,
    );

    const refreshToken = uuidv4();
    const family = existingFamily ?? uuidv4();
    const expiresAt = new Date(Date.now() + REFRESH_EXPIRY_DAYS * 24 * 60 * 60_000);

    await this.repo.createRefreshToken(userId, refreshToken, family, expiresAt);
    await this.redis.setex(REDIS_KEYS.SESSION(userId), 15 * 60, JSON.stringify({ userId, email }));

    return { accessToken, refreshToken, expiresIn: 900 };
  }

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  getPublicKey(): { publicKey: string; kid: string } {
    return {
      publicKey: this.config.get<string>('JWT_PUBLIC_KEY')!,
      kid: this.config.get<string>('JWT_KID')!,
    };
  }

  buildJwks() {
    const { publicKey, kid } = this.getPublicKey();
    const keyObj = jwt.decode(
      jwt.sign({}, this.config.get<string>('JWT_PRIVATE_KEY')!, { algorithm: 'RS256' }),
      { complete: true },
    );
    // Return PEM wrapped in minimal JWKS envelope
    return {
      keys: [{ kty: 'RSA', use: 'sig', alg: 'RS256', kid, x5c: [publicKey] }],
    };
  }
}
