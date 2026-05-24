import { Global, Inject, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect, NatsConnection, JetStreamClient } from 'nats';
import { AuthEnv } from '../../config/auth.config';

export const NATS_CLIENT = 'NATS_CLIENT';
export const JETSTREAM_CLIENT = 'JETSTREAM_CLIENT';

@Global()
@Module({
  providers: [
    {
      provide: NATS_CLIENT,
      useFactory: async (config: ConfigService<AuthEnv>): Promise<NatsConnection> => {
        return connect({ servers: config.get<string>('NATS_URL')! });
      },
      inject: [ConfigService],
    },
    {
      provide: JETSTREAM_CLIENT,
      useFactory: async (nc: NatsConnection): Promise<JetStreamClient> => {
        return nc.jetstream();
      },
      inject: [NATS_CLIENT],
    },
  ],
  exports: [NATS_CLIENT, JETSTREAM_CLIENT],
})
export class NatsModule implements OnApplicationShutdown {
  constructor(@Inject(NATS_CLIENT) private readonly nc: NatsConnection) {}

  async onApplicationShutdown() {
    await this.nc.drain();
  }
}
