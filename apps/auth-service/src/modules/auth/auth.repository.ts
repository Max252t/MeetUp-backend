import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import { AuthEnv } from '../../config/auth.config';
import { encryptPiiFields, decryptPiiFields, getPiiIndex } from '@meetup/db-kit';
import { createHash } from 'crypto';

@Injectable()
export class AuthRepository extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly piiConfig: { encryptionKey: Buffer; hmacKey: Buffer; fields: string[] };

  constructor(private readonly config: ConfigService<AuthEnv>) {
    super();
    this.piiConfig = {
      encryptionKey: Buffer.from(config.get('PII_ENCRYPTION_KEY', { infer: true })!, 'hex'),
      hmacKey: Buffer.from(config.get('PII_HMAC_KEY', { infer: true })!, 'hex'),
      fields: ['email', 'phone'],
    };
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async createUser(data: { email: string; passwordHash: string; phone?: string }) {
    const encrypted = encryptPiiFields(
      { email: data.email, phone: data.phone },
      this.piiConfig,
    ) as { email: string; emailIndex: string; phone?: string; phoneIndex?: string };

    return this.user.create({
      data: {
        emailEncrypted: encrypted.email,
        emailIndex: encrypted.emailIndex,
        phoneEncrypted: encrypted.phone ?? null,
        phoneIndex: encrypted.phoneIndex ?? null,
        passwordHash: data.passwordHash,
      },
    });
  }

  async findUserByEmail(email: string) {
    const idx = getPiiIndex(email, this.piiConfig.hmacKey);
    const user = await this.user.findFirst({
      where: { emailIndex: idx, deletedAt: null },
    });
    if (!user) return null;
    const dec = decryptPiiFields(
      { email: user.emailEncrypted, phone: user.phoneEncrypted ?? undefined },
      this.piiConfig,
    );
    return { ...user, email: dec.email, phone: dec.phone };
  }

  async findUserById(id: string) {
    const user = await this.user.findUnique({ where: { id } });
    if (!user) return null;
    const dec = decryptPiiFields(
      { email: user.emailEncrypted, phone: user.phoneEncrypted ?? undefined },
      this.piiConfig,
    );
    return { ...user, email: dec.email, phone: dec.phone };
  }

  async markUserVerified(userId: string) {
    return this.user.update({ where: { id: userId }, data: { isVerified: true } });
  }

  async createOtp(userId: string, purpose: string, code: string, ttlMinutes = 10) {
    const expiresAt = new Date(Date.now() + ttlMinutes * 60_000);
    return this.otpCode.create({ data: { userId, code, purpose, expiresAt } });
  }

  async findValidOtp(userId: string, purpose: string, code: string) {
    return this.otpCode.findFirst({
      where: { userId, purpose, code, usedAt: null, expiresAt: { gt: new Date() } },
    });
  }

  async useOtp(id: string) {
    return this.otpCode.update({ where: { id }, data: { usedAt: new Date() } });
  }

  async createRefreshToken(userId: string, token: string, family: string, expiresAt: Date) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    return this.refreshToken.create({ data: { userId, tokenHash, family, expiresAt } });
  }

  async findRefreshToken(token: string) {
    const tokenHash = createHash('sha256').update(token).digest('hex');
    return this.refreshToken.findUnique({ where: { tokenHash } });
  }

  async markRefreshTokenUsed(id: string) {
    return this.refreshToken.update({ where: { id }, data: { usedAt: new Date() } });
  }

  async invalidateFamily(family: string) {
    return this.refreshToken.deleteMany({ where: { family } });
  }

  async softDeleteUser(userId: string) {
    return this.user.update({ where: { id: userId }, data: { deletedAt: new Date() } });
  }

  async createAuditLog(data: {
    userId: string;
    event: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, unknown>;
  }) {
    return this.auditLog.create({ data });
  }
}
