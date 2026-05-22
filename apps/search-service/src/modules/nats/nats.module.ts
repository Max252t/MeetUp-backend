import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect, NatsConnection } from 'nats';
import { SearchEnv } from '../../config/search.config';

export const NATS_CLIENT = 'NATS_CLIENT';

@Global()
@Module({
  providers: [{
    provide: NATS_CLIENT,
    useFactory: async (config: ConfigService<SearchEnv>): Promise<NatsConnection> =>
      connect({ servers: config.get<string>('NATS_URL')! }),
    inject: [ConfigService],
  }],
  exports: [NATS_CLIENT],
})
export class NatsModule {}
