import { Controller, Get, Headers, Post } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth } from '@nestjs/swagger';
import { RecommendationsService } from './recommendations.service';

@ApiTags('recommendations')
@ApiBearerAuth()
@Controller('v1/recommendations')
export class RecommendationsController {
  constructor(private readonly recsService: RecommendationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get cached recommendations for current user' })
  getRecommendations(@Headers('x-user-id') userId: string) {
    return this.recsService.getRecommendations(userId);
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Trigger recommendation refresh (async)' })
  triggerRefresh(@Headers('x-user-id') userId: string) {
    return this.recsService.triggerRefresh(userId);
  }
}
