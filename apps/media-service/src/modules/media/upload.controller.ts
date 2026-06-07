import {
  BadRequestException,
  Controller,
  Delete,
  ForbiddenException,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
} from '@nestjs/common';
import {
  ApiConsumes,
  ApiOperation,
  ApiTags,
  ApiBearerAuth,
  ApiResponse,
  ApiHeader,
  ApiQuery,
  ApiBody,
  ApiProperty,
} from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import { MediaEnv } from '../../config/media.config';

const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_BYTES = 8 * 1024 * 1024;

class UploadPhotoResponseDto {
  @ApiProperty({ example: 'https://cdn.example.com/meetup-media/users/uuid/photo.jpg', description: 'Public URL of the uploaded photo' })
  url!: string;

  @ApiProperty({ example: 'users/uuid-v4/photo.jpg', description: 'S3 object key (use this for DELETE)' })
  key!: string;
}

@ApiTags('media')
@ApiBearerAuth()
@Controller('v1/media')
export class UploadController {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicUrl: string;

  constructor(private readonly config: ConfigService<MediaEnv>) {
    this.s3 = new S3Client({
      endpoint: config.get<string>('S3_ENDPOINT')!,
      region: config.get<string>('S3_REGION')!,
      credentials: {
        accessKeyId: config.get<string>('S3_ACCESS_KEY')!,
        secretAccessKey: config.get<string>('S3_SECRET_KEY')!,
      },
      forcePathStyle: true,
    });
    this.bucket = config.get<string>('S3_BUCKET')!;
    this.publicUrl = config.get<string>('S3_PUBLIC_URL')!;
  }

  @Post('photos')
  @ApiOperation({
    summary: 'Upload a photo',
    description: 'Accepts multipart/form-data with a single `file` field. Allowed types: jpeg, png, webp. Max size: 8 MB. Returns the public URL and S3 key.',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file'],
      properties: {
        file: { type: 'string', format: 'binary', description: 'Image file (jpeg/png/webp, ≤ 8 MB)' },
      },
    },
  })
  @ApiHeader({ name: 'x-user-id', description: 'Injected by API Gateway from JWT sub', required: true })
  @ApiResponse({ status: 201, description: 'Photo uploaded', type: UploadPhotoResponseDto })
  @ApiResponse({ status: 400, description: 'No file / invalid MIME / file too large' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async uploadPhoto(
    @Req() req: any,
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId) throw new BadRequestException('x-user-id header required');

    const data = await (req as any).file();
    if (!data) throw new BadRequestException('No file uploaded');

    const mimeType: string = data.mimetype;
    if (!ALLOWED_MIME.includes(mimeType)) {
      throw new BadRequestException(`Unsupported file type: ${mimeType}. Allowed: ${ALLOWED_MIME.join(', ')}`);
    }

    const chunks: Buffer[] = [];
    let totalSize = 0;
    for await (const chunk of data.file) {
      totalSize += chunk.length;
      if (totalSize > MAX_BYTES) {
        throw new BadRequestException('File size exceeds 8 MB limit');
      }
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    const ext = mimeType.split('/')[1].replace('jpeg', 'jpg');
    const key = `users/${userId}/${uuidv4()}.${ext}`;

    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        ContentLength: buffer.length,
      }),
    );

    const url = `${this.publicUrl}/${key}`;
    return { url, key };
  }

  @Delete('photos')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a photo by S3 key',
    description: 'Pass the `key` returned by POST /v1/media/photos as a query parameter. Users can only delete their own photos.',
  })
  @ApiQuery({ name: 'key', description: 'S3 object key, e.g. users/uuid/photo.jpg', required: true, example: 'users/uuid-v4/photo.jpg' })
  @ApiHeader({ name: 'x-user-id', description: 'Injected by API Gateway from JWT sub', required: true })
  @ApiResponse({ status: 204, description: 'Photo deleted' })
  @ApiResponse({ status: 400, description: 'Missing key param' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Cannot delete another user\'s photo' })
  async deletePhoto(
    @Query('key') key: string,
    @Headers('x-user-id') userId: string,
  ) {
    if (!userId) throw new BadRequestException('x-user-id header required');
    if (!key) throw new BadRequestException('key query param required');
    if (!key.startsWith(`users/${userId}/`)) {
      throw new ForbiddenException('Cannot delete photo of another user');
    }

    await this.s3.send(
      new DeleteObjectCommand({ Bucket: this.bucket, Key: key }),
    );
  }
}
