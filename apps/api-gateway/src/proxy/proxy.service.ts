import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { FastifyRequest, FastifyReply } from 'fastify';

@Injectable()
export class ProxyService {
  private readonly logger = new Logger(ProxyService.name);

  async forward(
    req: FastifyRequest,
    reply: FastifyReply,
    targetBase: string,
    extraHeaders?: Record<string, string>,
  ): Promise<void> {
    const url = new URL(req.url, targetBase);

    const headers: Record<string, string> = {};
    const skip = new Set(['host', 'connection', 'transfer-encoding']);
    for (const [k, v] of Object.entries(req.headers)) {
      if (!skip.has(k.toLowerCase()) && typeof v === 'string') {
        headers[k] = v;
      }
    }
    if (extraHeaders) {
      Object.assign(headers, extraHeaders);
    }

    const isMultipart = (req.headers['content-type'] ?? '').includes('multipart/');
    const hasBody =
      req.method !== 'GET' && req.method !== 'HEAD' && req.method !== 'DELETE';

    let body: Buffer | string | undefined;

    if (hasBody) {
      if (isMultipart) {
        // Multipart: stream raw bytes from the underlying socket
        body = await this.streamRaw(req);
      } else {
        const parsed = (req as any).body;
        if (parsed !== undefined && parsed !== null) {
          body = JSON.stringify(parsed);
          headers['content-type'] = 'application/json';
          headers['content-length'] = String(Buffer.byteLength(body as string));
        }
      }
    }

    let upstream: Response;
    try {
      upstream = await fetch(url.toString(), {
        method: req.method,
        headers,
        body,
      } as RequestInit);
    } catch (err: any) {
      this.logger.error(`Proxy error ${req.method} ${url}: ${err.message}`);
      throw new ServiceUnavailableException('Upstream service unavailable');
    }

    reply.status(upstream.status);
    upstream.headers.forEach((value: string, key: string) => {
      if (key.toLowerCase() !== 'transfer-encoding') {
        reply.header(key, value);
      }
    });

    const buf = await upstream.arrayBuffer();
    reply.send(Buffer.from(buf));
  }

  private streamRaw(req: FastifyRequest): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const raw = (req.raw as any) ?? (req as any).req ?? req;
      const chunks: Buffer[] = [];
      raw.on('data', (c: Buffer) => chunks.push(c));
      raw.on('end', () => resolve(Buffer.concat(chunks)));
      raw.on('error', reject);
    });
  }
}
