import { All, Controller, Req, Res } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';
import { ConfigService } from '@nestjs/config';
import { GatewayEnv } from '../config/gateway.config';
import { ProxyService } from './proxy.service';
import { Public } from '../modules/auth/public.decorator';

@Controller()
export class ProxyController {
  private readonly authUrl: string;
  private readonly profileUrl: string;
  private readonly mediaUrl: string;

  constructor(
    config: ConfigService<GatewayEnv>,
    private readonly proxy: ProxyService,
  ) {
    this.authUrl = config.get<string>('AUTH_SERVICE_URL')!;
    this.profileUrl = config.get<string>('PROFILE_SERVICE_URL')!;
    this.mediaUrl = config.get<string>('MEDIA_SERVICE_URL')!;
  }

  // ── Auth (public) ────────────────────────────────────────────────────────────
  @All('v1/auth/*')
  @Public()
  async proxyAuth(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.proxy.forward(req, reply, this.authUrl);
  }

  // ── Interests (public) ───────────────────────────────────────────────────────
  @All('v1/interests*')
  @Public()
  async proxyInterests(@Req() req: FastifyRequest, @Res() reply: FastifyReply) {
    return this.proxy.forward(req, reply, this.profileUrl);
  }

  // ── Profiles (JWT-protected) ─────────────────────────────────────────────────
  @All('v1/profiles/*')
  async proxyProfiles(
    @Req() req: FastifyRequest & { user?: { sub: string } },
    @Res() reply: FastifyReply,
  ) {
    const userId = req.user?.sub ?? '';
    return this.proxy.forward(req, reply, this.profileUrl, { 'x-user-id': userId });
  }

  // ── Media (JWT-protected) ────────────────────────────────────────────────────
  @All('v1/media/*')
  async proxyMedia(
    @Req() req: FastifyRequest & { user?: { sub: string } },
    @Res() reply: FastifyReply,
  ) {
    const userId = req.user?.sub ?? '';
    return this.proxy.forward(req, reply, this.mediaUrl, { 'x-user-id': userId });
  }
}
