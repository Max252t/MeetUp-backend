import { encryptAes, decryptAes, blindIndex } from '@meetup/crypto';

export interface PiiConfig {
  encryptionKey: Buffer;
  hmacKey: Buffer;
  fields: string[];
}

export function encryptPiiFields<T extends Record<string, unknown>>(
  data: T,
  config: PiiConfig,
): T & Record<string, unknown> {
  const result: Record<string, unknown> = { ...data };
  for (const field of config.fields) {
    if (field in result && typeof result[field] === 'string') {
      const plaintext = result[field] as string;
      result[field] = encryptAes(plaintext, config.encryptionKey);
      result[`${field}Index`] = blindIndex(plaintext, config.hmacKey);
    }
  }
  return result as T & Record<string, unknown>;
}

export function decryptPiiFields<T extends Record<string, unknown>>(data: T, config: PiiConfig): T {
  const result: Record<string, unknown> = { ...data };
  for (const field of config.fields) {
    if (field in result && typeof result[field] === 'string') {
      try {
        result[field] = decryptAes(result[field] as string, config.encryptionKey);
      } catch {
        // field not encrypted — leave as-is
      }
    }
  }
  return result as T;
}

export function getPiiIndex(value: string, hmacKey: Buffer): string {
  return blindIndex(value, hmacKey);
}
