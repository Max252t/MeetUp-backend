import jwt from 'jsonwebtoken';

export interface JwtPayload {
  sub: string;
  iat?: number;
  exp?: number;
  jti?: string;
}

export interface AccessTokenPayload extends JwtPayload {
  email: string;
  role?: string;
}

export function signAccessToken(
  payload: AccessTokenPayload,
  privateKey: string,
  expiresIn = '15m',
): string {
  return jwt.sign(payload, privateKey, { algorithm: 'RS256', expiresIn } as jwt.SignOptions);
}

export function verifyAccessToken(token: string, publicKey: string): AccessTokenPayload {
  return jwt.verify(token, publicKey, { algorithms: ['RS256'] }) as AccessTokenPayload;
}

export function decodeToken(token: string): JwtPayload | null {
  return jwt.decode(token) as JwtPayload | null;
}
