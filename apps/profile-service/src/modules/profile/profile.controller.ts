import { Body, Controller, Get, Param, Patch, Headers, Delete, HttpCode, HttpStatus } from '@nestjs/common';
import {
  ApiOperation,
  ApiTags,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
  ApiHeader,
  ApiBody,
  ApiProperty,
} from '@nestjs/swagger';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/update-profile.dto';

class ProfileDto {
  @ApiProperty({ example: 'uuid-v4' }) id!: string;
  @ApiProperty({ example: 'Alice' }) name!: string;
  @ApiProperty({ example: 'Software engineer from Berlin', nullable: true }) bio!: string;
  @ApiProperty({ example: 'MALE', enum: ['MALE', 'FEMALE', 'OTHER'], nullable: true }) gender!: string | null;
  @ApiProperty({ example: '1995-04-12', nullable: true }) birthdate!: string | null;
  @ApiProperty({ example: 25, nullable: true }) age!: number | null;
  @ApiProperty({ example: 'Berlin', nullable: true }) city!: string | null;
  @ApiProperty({ example: 'DE', nullable: true }) country!: string | null;
  @ApiProperty({ type: [String], example: ['https://cdn.example.com/users/uuid/photo.jpg'] }) photos!: string[];
  @ApiProperty({ type: [String], example: ['Football', 'Rock'] }) interests!: string[];
  @ApiProperty() isActive!: boolean;
  @ApiProperty() createdAt!: string;
  @ApiProperty() updatedAt!: string;
}

@ApiTags('profiles')
@ApiBearerAuth()
@Controller('v1/profiles')
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Patch('me')
  @ApiOperation({ summary: 'Update own profile (partial)', description: 'Any subset of fields can be sent. Only provided fields are updated.' })
  @ApiHeader({ name: 'x-user-id', description: 'Injected by API Gateway from JWT sub', required: true })
  @ApiBody({ type: UpdateProfileDto })
  @ApiResponse({ status: 200, description: 'Updated profile', type: ProfileDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  patchProfile(
    @Headers('x-user-id') userId: string,
    @Body() dto: UpdateProfileDto,
  ) {
    return this.profileService.patch(userId, dto);
  }

  @Get('me')
  @ApiOperation({ summary: 'Get own profile' })
  @ApiHeader({ name: 'x-user-id', description: 'Injected by API Gateway from JWT sub', required: true })
  @ApiResponse({ status: 200, description: 'Own profile with computed age', type: ProfileDto })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  getMyProfile(@Headers('x-user-id') userId: string) {
    return this.profileService.getProfile(userId);
  }

  @Get(':userId')
  @ApiOperation({ summary: 'Get profile by user ID' })
  @ApiParam({ name: 'userId', description: 'Target user UUID' })
  @ApiResponse({ status: 200, description: 'Profile', type: ProfileDto })
  @ApiResponse({ status: 404, description: 'Profile not found' })
  getProfile(@Param('userId') userId: string) {
    return this.profileService.getProfile(userId);
  }

  @Delete('me')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Deactivate own profile (soft delete)' })
  @ApiHeader({ name: 'x-user-id', description: 'Injected by API Gateway from JWT sub', required: true })
  @ApiResponse({ status: 204, description: 'Profile deactivated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  deactivate(@Headers('x-user-id') userId: string) {
    return this.profileService.deactivate(userId);
  }
}
