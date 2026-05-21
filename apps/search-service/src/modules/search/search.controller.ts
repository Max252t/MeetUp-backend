import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { IsOptional, IsString, IsNumber, IsArray } from 'class-validator';
import { Transform } from 'class-transformer';

class SearchQueryDto {
  @IsOptional() @IsString() q?: string;
  @IsOptional() @IsString() gender?: string;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsNumber() minAge?: number;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsNumber() maxAge?: number;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() country?: string;
  @IsOptional() @Transform(({ value }) => (Array.isArray(value) ? value : [value])) @IsArray() interests?: string[];
  @IsOptional() @Transform(({ value }) => Number(value)) @IsNumber() from?: number;
  @IsOptional() @Transform(({ value }) => Number(value)) @IsNumber() size?: number;
}

@ApiTags('search')
@Controller('v1/search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get('profiles')
  @ApiOperation({ summary: 'Search profiles with filters' })
  @ApiQuery({ name: 'q', required: false })
  search(@Query() query: SearchQueryDto) {
    return this.searchService.search(query.q ?? '', {
      gender: query.gender,
      minAge: query.minAge,
      maxAge: query.maxAge,
      city: query.city,
      country: query.country,
      interests: query.interests,
      from: query.from,
      size: query.size,
    });
  }
}
