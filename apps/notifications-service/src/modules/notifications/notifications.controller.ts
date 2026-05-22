import { Body, Controller, Delete, HttpCode, HttpStatus, Post, Headers } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';
import { NotificationsService } from './notifications.service';

class RegisterTokenDto {
  @IsString() token!: string;
  @IsIn(['android', 'ios']) platform!: string;
}

class RemoveTokenDto {
  @IsString() token!: string;
}

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('v1/notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Post('device-token')
  @ApiOperation({ summary: 'Register FCM device token' })
  registerToken(@Headers('x-user-id') userId: string, @Body() dto: RegisterTokenDto) {
    return this.notificationsService.registerDeviceToken(userId, dto.token, dto.platform);
  }

  @Delete('device-token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove FCM device token (logout)' })
  removeToken(@Body() dto: RemoveTokenDto) {
    return this.notificationsService.removeDeviceToken(dto.token);
  }
}
