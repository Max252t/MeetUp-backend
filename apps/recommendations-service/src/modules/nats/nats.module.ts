import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect, NatsConnection, JetStreamClient } from 'nats';
import { RecsEnv } from '../../config/recs.config';

export const NATS_CLIENT = 'NATS_CLIENT';
export const JETSTREAM_CLIENT = 'JETSTREAM_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: NATS_CLIENT,
      useFactory: async (config: ConfigService<RecsEnv>): Promise<NatsConnection> =>
        connect({ servers: config.get<string>('NATS_URL')! }),
      inject: [ConfigService],
    },
    {
      provide: JETSTREAM_CLIENT,
      useFactory: async (nc: NatsConnection): Promise<JetStreamClient> => nc.jetstream(),
      inject: [NATS_CLIENT],
    },
  ],
  exports: [NATS_CLIENT, JETSTREAM_CLIENT],
})
export class NatsModule {}
