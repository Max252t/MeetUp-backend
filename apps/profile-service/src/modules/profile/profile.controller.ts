import { Body, Controller, Get, Param, Put, Headers, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { UpsertProfileDto } from './dto/upsert-profile.dto';

@ApiTags('profiles')
@ApiBearerAuth()
@Controller('v1/profiles')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Put('me')
  @ApiOperation({ summary: 'Create or update own profile' })
  upsertProfile(
    @Headers('x-user-id') userId: string,
    @Body() dto: UpsertProfileDto,
  ) {
    return this.profileService.upsert(userId, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get own profile' })
  getMyProfile(@Headers('x-user-id') userId: string) {
    return this.profileService.getProfile(userId);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get profile by user ID' })
  getProfile(@Param('userId') userId: string) {
    return this.profileService.getProfile(userId);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate own profile (called on GDPR deletion)' })
  deactivate(@Headers('x-user-id') userId: string) {
    return this.profileService.deactivate(userId);
  }
}
