import { Global, Inject, Module, type OnApplicationShutdown } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import type { AppConfig } from '@/config/configuration';
import { REDIS_CLIENT } from './redis.constants';

/**
 * Shared ioredis client for application-level caching/locks.
 * BullMQ creates its own connections (see QueueModule) as recommended by BullMQ.
 */
@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>): Redis => {
        const { connection } = config.get('redis', { infer: true });
        return new Redis({
          ...connection,
          lazyConnect: true,
          maxRetriesPerRequest: 3,
          enableOfflineQueue: true,
        });
      },
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule implements OnApplicationShutdown {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async onApplicationShutdown(): Promise<void> {
    await this.redis.quit().catch(() => undefined);
  }
}
