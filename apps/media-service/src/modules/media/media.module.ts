import { Module } from '@nestjs/common';
import { MediaController } from './media.controller';
import { MediaService } from './media.service';
import { UploadController } from './upload.controller';

@Module({
  controllers: [MediaController, UploadController],
  providers: [MediaService],
})
export class MediaModule {}
