import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Headers } from '@nestjs/common';
import {
  ApiBody,
  ApiHeader,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiResponse,
  ApiTags,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { IsString, IsNumber, IsPositive } from 'class-validator';
import { MediaService } from './media.service';

// ── Request / Response DTOs ────────────────────────────────────────────────

class RequestUploadDto {
  @ApiProperty({
    example: 'image/jpeg',
    description: 'MIME type of the file to upload. Allowed: image/jpeg, image/png, image/webp, video/mp4',
  })
  @IsString()
  mimeType!: string;

  @ApiProperty({ example: 2097152, description: 'File size in bytes (max = MAX_FILE_SIZE_MB × 1 048 576)' })
  @IsNumber()
  @IsPositive()
  sizeBytes!: number;
}

class RequestUploadResponseDto {
  @ApiProperty({ example: 'uuid-v4', description: 'Media object ID — use this to confirm the upload' })
  mediaId!: string;

  @ApiProperty({ description: 'Pre-signed S3 PUT URL. Valid for `expiresIn` seconds.' })
  uploadUrl!: string;

  @ApiProperty({ example: 3600, description: 'Seconds until the pre-signed URL expires' })
  expiresIn!: number;
}

class MediaObjectDto {
  @ApiProperty({ example: 'uuid-v4' }) id!: string;
  @ApiProperty({ example: 'uuid-user' }) userId!: string;
  @ApiProperty({ example: 'meetup-media' }) bucket!: string;
  @ApiProperty({ example: 'uuid-user/uuid-media.jpg' }) key!: string;
  @ApiProperty({ example: 'image/jpeg' }) mimeType!: string;
  @ApiProperty({ example: 2097152 }) sizeBytes!: number;
  @ApiProperty({ example: 'active', enum: ['pending', 'active', 'deleted'] }) status!: string;
  @ApiProperty({ example: 'https://cdn.example.com/meetup-media/uuid-user/uuid-media.jpg', nullable: true })
  url!: string | null;
  @ApiProperty({ nullable: true }) uploadedAt!: string | null;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

// ── Controller ─────────────────────────────────────────────────────────────

@ApiTags('media')
@ApiBearerAuth()
@Controller('v1/media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload-url')
  @ApiOperation({
    summary: 'Get a pre-signed S3 upload URL',
    description:
      'Returns a short-lived pre-signed PUT URL. ' +
      'Upload the file directly to S3 using that URL, then call POST /v1/media/:mediaId/confirm to mark it active.',
  })
  @ApiHeader({ name: 'x-user-id', description: 'Injected by API Gateway from JWT sub', required: true })
  @ApiBody({ type: RequestUploadDto })
  @ApiResponse({ status: 201, description: 'Pre-signed URL created', type: RequestUploadResponseDto })
  @ApiResponse({ status: 400, description: 'Unsupported MIME type or file size exceeds limit' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  requestUpload(@Headers('x-user-id') userId: string, @Body() dto: RequestUploadDto) {
    return this.mediaService.requestUpload(userId, dto.mimeType, dto.sizeBytes);
  }

  @Post(':mediaId/confirm')
  @ApiOperation({
    summary: 'Confirm upload complete',
    description:
      'Call this after the file has been PUT to the pre-signed URL. ' +
      'Sets the media object status to `active`, stores the public URL, and publishes a `media.uploaded` NATS event.',
  })
  @ApiHeader({ name: 'x-user-id', description: 'Injected by API Gateway from JWT sub', required: true })
  @ApiParam({ name: 'mediaId', description: 'Media UUID returned by POST /v1/media/upload-url' })
  @ApiResponse({ status: 201, description: 'Upload confirmed', type: MediaObjectDto })
  @ApiResponse({ status: 400, description: 'Media object not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  confirmUpload(@Param('mediaId') mediaId: string, @Headers('x-user-id') userId: string) {
    return this.mediaService.confirmUpload(mediaId, userId);
  }

  @Get('my')
  @ApiOperation({
    summary: 'List own uploaded media',
    description: 'Returns all active (non-deleted) media objects belonging to the authenticated user.',
  })
  @ApiHeader({ name: 'x-user-id', description: 'Injected by API Gateway from JWT sub', required: true })
  @ApiResponse({ status: 200, description: 'List of media objects', type: [MediaObjectDto] })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMyMedia(@Headers('x-user-id') userId: string) {
    return this.mediaService.getUserMedia(userId);
  }

  @Delete(':mediaId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Delete a media object by ID',
    description:
      'Removes the file from S3 and soft-deletes the DB record (status → `deleted`). ' +
      'For deleting profile photos uploaded via POST /v1/media/photos, use DELETE /v1/media/photos?key=…',
  })
  @ApiHeader({ name: 'x-user-id', description: 'Injected by API Gateway from JWT sub', required: true })
  @ApiParam({ name: 'mediaId', description: 'Media UUID to delete' })
  @ApiResponse({ status: 204, description: 'Media deleted' })
  @ApiResponse({ status: 400, description: 'Media not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  deleteMedia(@Param('mediaId') mediaId: string, @Headers('x-user-id') userId: string) {
    return this.mediaService.deleteMedia(mediaId, userId);
  }
}
