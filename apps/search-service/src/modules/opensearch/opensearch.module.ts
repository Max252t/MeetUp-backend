import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Client } from '@opensearch-project/opensearch';
import { SearchEnv } from '../../config/search.config';

export const OPENSEARCH_CLIENT = 'OPENSEARCH_CLIENT';
export const PROFILES_INDEX = 'profiles';

@Global()
@Module({
  providers: [
    {
      provide: OPENSEARCH_CLIENT,
      useFactory: (config: ConfigService<SearchEnv>): Client =>
        new Client({ node: config.get('OPENSEARCH_URL', { infer: true })! }),
      inject: [ConfigService],
    },
  ],
  exports: [OPENSEARCH_CLIENT],
})
export class OpenSearchModule {}
