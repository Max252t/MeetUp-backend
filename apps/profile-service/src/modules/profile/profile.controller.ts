import { Body, Controller, Get, Param, Patch, Headers, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

@ApiTags('profiles')
@ApiBearerAuth()
@Controller('v1/profiles')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Patch('me')
  @ApiOperation({ summary: 'Update own profile (partial)' })
  patchProfile(
    @Headers('x-user-id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profileService.patch(userId, dto);
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
  @ApiOperation({ summary: 'Deactivate own profile' })
  deactivate(@Headers('x-user-id') userId: string) {
    return this.profileService.deactivate(userId);
  }
}
