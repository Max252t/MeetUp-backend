import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Headers } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsString, IsNumber, IsPositive } from 'class-validator';
import { MediaService } from './media.service';

class RequestUploadDto {
  @IsString() mimeType!: string;
  @IsNumber() @IsPositive() sizeBytes!: number;
}

@ApiTags('media')
@ApiBearerAuth()
@Controller('v1/media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload-url')
  @ApiOperation({ summary: 'Get presigned S3 upload URL' })
  requestUpload(@Headers('x-user-id') userId: string, @Body() dto: RequestUploadDto) {
    return this.mediaService.requestUpload(userId, dto.mimeType, dto.sizeBytes);
  }

  @Post(':mediaId/confirm')
  @ApiOperation({ summary: 'Confirm upload complete (called after direct S3 upload)' })
  confirmUpload(@Param('mediaId') mediaId: string, @Headers('x-user-id') userId: string) {
    return this.mediaService.confirmUpload(mediaId, userId);
  }

  @Get('my')
  @ApiOperation({ summary: 'List own uploaded media' })
  getMyMedia(@Headers('x-user-id') userId: string) {
    return this.mediaService.getUserMedia(userId);
  }

  @Delete(':mediaId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a media object' })
  deleteMedia(@Param('mediaId') mediaId: string, @Headers('x-user-id') userId: string) {
    return this.mediaService.deleteMedia(mediaId, userId);
  }
}
