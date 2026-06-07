import { BadRequestException, Inject, Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { PrismaClient } from '../../generated/prisma';
import { JetStreamClient, StringCodec } from 'nats';
import { JETSTREAM_CLIENT } from '../nats/nats.module';
import { NATS_SUBJECTS } from '@meetup/shared-config';
import { v4 as uuidv4 } from 'uuid';
import { MediaEnv } from '../../config/media.config';

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'video/mp4'];

@Injectable()
export class MediaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly s3: S3Client;
  private readonly sc = StringCodec();

  constructor(
    private readonly config: ConfigService<MediaEnv>,
    @Inject(JETSTREAM_CLIENT) private readonly js: JetStreamClient,
  ) {
    super();
    this.s3 = new S3Client({
      endpoint: config.get<string>('S3_ENDPOINT')!,
      region: config.get<string>('S3_REGION')!,
      credentials: {
        accessKeyId: config.get<string>('S3_ACCESS_KEY')!,
        secretAccessKey: config.get<string>('S3_SECRET_KEY')!,
      },
      forcePathStyle: true,
    });
  }

  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }

  async requestUpload(userId: string, mimeType: string, sizeBytes: number) {
    if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
      throw new BadRequestException(`MIME type ${mimeType} not allowed`);
    }
    const maxBytes = this.config.get<number>('MAX_FILE_SIZE_MB')! * 1024 * 1024;
    if (sizeBytes > maxBytes) throw new BadRequestException('File too large');

    const mediaId = uuidv4();
    const ext = mimeType.split('/')[1];
    const key = `${userId}/${mediaId}.${ext}`;
    const bucket = this.config.get<string>('S3_BUCKET')!;
    const expiresIn = this.config.get<number>('PRESIGNED_URL_EXPIRES')!;

    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      ContentType: mimeType,
      ContentLength: sizeBytes,
    });

    const uploadUrl = await getSignedUrl(this.s3, command, { expiresIn });

    await this.mediaObject.create({
      data: { id: mediaId, userId, bucket, key, mimeType, sizeBytes, status: 'pending' },
    });

    return { mediaId, uploadUrl, expiresIn };
  }

  async confirmUpload(mediaId: string, userId: string) {
    const endpoint = this.config.get<string>('S3_ENDPOINT')!;
    const bucket = this.config.get<string>('S3_BUCKET')!;

    const media = await this.mediaObject.update({
      where: { id: mediaId },
      data: {
        status: 'active',
        uploadedAt: new Date(),
        url: `${endpoint}/${bucket}/${mediaId}`,
      },
    });

    const event = {
      id: uuidv4(),
      type: NATS_SUBJECTS.MEDIA_UPLOADED,
      occurredAt: new Date().toISOString(),
      data: { mediaId, userId, url: media.url!, mimeType: media.mimeType, uploadedAt: media.uploadedAt!.toISOString() },
    };
    await this.js.publish(NATS_SUBJECTS.MEDIA_UPLOADED, this.sc.encode(JSON.stringify(event)));

    return media;
  }

  async getUserMedia(userId: string) {
    return this.mediaObject.findMany({ where: { userId, status: 'active' } });
  }

  async deleteMedia(mediaId: string, userId: string) {
    const media = await this.mediaObject.findFirst({ where: { id: mediaId, userId } });
    if (!media) throw new BadRequestException('Media not found');

    await this.s3.send(new DeleteObjectCommand({ Bucket: media.bucket, Key: media.key }));
    await this.mediaObject.update({ where: { id: mediaId }, data: { status: 'deleted' } });
  }
}
