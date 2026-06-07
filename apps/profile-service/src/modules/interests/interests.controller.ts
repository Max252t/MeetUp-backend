import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiResponse, ApiProperty } from '@nestjs/swagger';
import { InterestsService } from './interests.service';

class InterestDto {
  @ApiProperty({ example: 'uuid-v4' }) id!: string;
  @ApiProperty({ example: 'Football' }) name!: string;
  @ApiProperty({ example: 'Sports' }) category!: string;
}

@ApiTags('interests')
@Controller('v1/interests')
export class InterestsController {
  constructor(private readonly interestsService: InterestsService) {}

  @Get()
  @ApiOperation({
    summary: 'Get all available interests',
    description: 'Public endpoint. Returns all seeded interests ordered by category then name.',
  })
  @ApiResponse({ status: 200, description: 'List of interests', type: [InterestDto] })
  findAll() {
    return this.interestsService.findAll();
  }
}
