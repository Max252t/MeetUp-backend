import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';

export interface TracingOptions {
  serviceName: string;
  serviceVersion?: string;
  otlpEndpoint?: string;
}

export function initTracing(options: TracingOptions): NodeSDK {
  const { serviceName, serviceVersion = '0.0.1' } = options;

  const sdk = new NodeSDK({
    resource: new Resource({
      [ATTR_SERVICE_NAME]: serviceName,
      [ATTR_SERVICE_VERSION]: serviceVersion,
    }),
    instrumentations: [new HttpInstrumentation()],
  });

  sdk.start();

  process.on('SIGTERM', async () => {
    await sdk.shutdown();
  });

  return sdk;
}
