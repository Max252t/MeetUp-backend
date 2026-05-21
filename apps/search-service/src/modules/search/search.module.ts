import { Module } from '@nestjs/common';
import { SearchController } from './search.controller';
import { SearchService } from './search.service';
import { SearchListener } from './search.listener';

@Module({
  controllers: [SearchController],
  providers: [SearchService, SearchListener],
})
export class SearchModule {}
