import { join } from 'path';
import { Transport } from '@nestjs/microservices';

export function createGrpcOptions(service: string, port: number) {
  return {
    transport: Transport.GRPC,
    options: {
      url: `0.0.0.0:${port}`,
      package: service,
      protoPath: join(__dirname, `../proto/${service}.proto`),
    },
  };
}
