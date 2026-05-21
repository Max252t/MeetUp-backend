import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SearchModule } from './modules/search/search.module';
import { OpenSearchModule } from './modules/opensearch/opensearch.module';
import { NatsModule } from './modules/nats/nats.module';
import { validateSearchEnv } from './config/search.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateSearchEnv }),
    NatsModule,
    OpenSearchModule,
    SearchModule,
  ],
})
export class AppModule {}
