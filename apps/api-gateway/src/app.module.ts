import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { HealthModule } from './modules/health/health.module';
import { ProxyModule } from './proxy/proxy.module';
import { JwtAuthGuard } from './modules/auth/jwt-auth.guard';
import { GlobalExceptionFilter } from './common/filters/exception.filter';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor';
import { validateGatewayEnv, GatewayEnv } from './config/gateway.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateGatewayEnv }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<GatewayEnv>) => [
        {
          ttl: config.get<number>('RATE_LIMIT_TTL')!,
          limit: config.get<number>('RATE_LIMIT_MAX')!,
        },
      ],
    }),
    AuthModule,
    HealthModule,
    ProxyModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: RequestIdInterceptor },
  ],
})
export class AppModule {}
