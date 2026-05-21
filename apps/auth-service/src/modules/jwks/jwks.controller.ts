import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from '../auth/auth.service';

@ApiTags('jwks')
@Controller()
export class JwksController {
  constructor(private readonly authService: AuthService) {}

  @Get('.well-known/jwks.json')
  @ApiOperation({ summary: 'JWKS endpoint — public keys for JWT verification' })
  getJwks() {
    return this.authService.buildJwks();
  }

  @Get('.well-known/public-key')
  @ApiOperation({ summary: 'Raw RSA public key (PEM)' })
  getPublicKey() {
    return this.authService.getPublicKey();
  }
}
