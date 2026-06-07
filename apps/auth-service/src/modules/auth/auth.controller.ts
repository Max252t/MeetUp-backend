import { Body, Controller, Delete, HttpCode, HttpStatus, Post, Req } from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiProperty,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FastifyRequest } from 'fastify';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { VerifyOtpDto } from './dto/verify-otp.dto';
import { LoginDto } from './dto/login.dto';
import { RefreshDto } from './dto/refresh.dto';

// ── Response-shape DTOs ────────────────────────────────────────────────────

class RegisterResponseDto {
  @ApiProperty({ example: 'uuid-v4', description: 'Created user UUID' })
  userId!: string;

  @ApiProperty({ example: 'OTP sent' })
  message!: string;

  @ApiProperty({
    example: '123456',
    description: 'OTP code — only present in non-production environments for testing',
    required: false,
  })
  _devOtp?: string;
}

class TokenPairDto {
  @ApiProperty({ description: 'Short-lived JWT access token (15 min)' })
  accessToken!: string;

  @ApiProperty({ description: 'Long-lived refresh token UUID (30 days)' })
  refreshToken!: string;

  @ApiProperty({ example: 900, description: 'Access token TTL in seconds' })
  expiresIn!: number;
}

class LogoutBodyDto extends RefreshDto {
  @ApiProperty({ example: 'uuid-v4', description: 'Own user UUID' })
  userId!: string;
}

class DeleteAccountBodyDto {
  @ApiProperty({ example: 'uuid-v4', description: 'Own user UUID' })
  userId!: string;
}

// ── Controller ─────────────────────────────────────────────────────────────

@ApiTags('auth')
@Controller('v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({
    summary: 'Register a new user',
    description:
      'Creates a new account, stores the hashed password, and sends a 6-digit OTP to the provided e-mail. ' +
      'The account is not active until the OTP is verified via POST /v1/auth/verify-otp. ' +
      'In non-production environments the OTP is also returned in `_devOtp` for automated testing.',
  })
  @ApiBody({ type: RegisterDto })
  @ApiResponse({ status: 201, description: 'User created, OTP sent', type: RegisterResponseDto })
  @ApiResponse({ status: 400, description: 'Validation error (invalid e-mail, short password, etc.)' })
  @ApiResponse({ status: 409, description: 'E-mail already registered' })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto.email, dto.password, dto.name, dto.phone);
  }

  @Post('verify-otp')
  @ApiOperation({
    summary: 'Verify OTP and activate account',
    description:
      'Validates the 6-digit code sent during registration. On success marks the user as verified ' +
      'and immediately issues an access + refresh token pair so the caller is logged in right away.',
  })
  @ApiBody({ type: VerifyOtpDto })
  @ApiResponse({ status: 201, description: 'OTP valid — returns token pair', type: TokenPairDto })
  @ApiResponse({ status: 400, description: 'Invalid / expired OTP or too many attempts' })
  @ApiResponse({ status: 401, description: 'E-mail not found' })
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto.email, dto.code);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Login with e-mail + password',
    description:
      'Validates credentials and issues a new token pair. The account must be verified. ' +
      'The IP address is recorded in the audit log.',
  })
  @ApiBody({ type: LoginDto })
  @ApiResponse({ status: 200, description: 'Login successful', type: TokenPairDto })
  @ApiResponse({ status: 401, description: 'Wrong credentials or e-mail not verified' })
  login(@Body() dto: LoginDto, @Req() req: FastifyRequest) {
    return this.authService.login(dto.email, dto.password, req.ip);
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Rotate refresh token',
    description:
      'Exchanges a valid refresh token for a new access + refresh pair. ' +
      'The old token is immediately invalidated. ' +
      'If a token is reused (replay attack), the entire token family is revoked.',
  })
  @ApiBody({ type: RefreshDto })
  @ApiResponse({ status: 200, description: 'New token pair issued', type: TokenPairDto })
  @ApiResponse({ status: 401, description: 'Token invalid, expired, or reused' })
  refresh(@Body() dto: RefreshDto) {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('logout')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Logout — invalidate session',
    description:
      'Invalidates the refresh-token family and clears the Redis session entry. ' +
      'The access token remains valid until its 15-minute TTL expires (stateless).',
  })
  @ApiBody({ type: LogoutBodyDto })
  @ApiResponse({ status: 204, description: 'Session invalidated' })
  logout(@Body() dto: RefreshDto & { userId: string }) {
    return this.authService.logout(dto.userId, dto.refreshToken);
  }

  @Delete('account')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete own account (GDPR)',
    description:
      'Soft-deletes the user record (sets `deletedAt`), clears the session, ' +
      'and publishes a `user.deleted` event so downstream services can purge PII data.',
  })
  @ApiBody({ type: DeleteAccountBodyDto })
  @ApiResponse({ status: 204, description: 'Account deleted' })
  @ApiResponse({ status: 400, description: 'User not found' })
  deleteAccount(@Body() body: { userId: string }) {
    return this.authService.deleteAccount(body.userId);
  }
}
