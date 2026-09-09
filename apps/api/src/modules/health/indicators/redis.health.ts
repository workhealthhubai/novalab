import { Inject, Injectable } from '@nestjs/common';
import { HealthIndicatorService, type HealthIndicatorResult } from '@nestjs/terminus';
import type { Redis } from 'ioredis';
import { withTimeout } from '@/common/utils/with-timeout';
import { REDIS_CLIENT } from '@/infrastructure/redis/redis.constants';

@Injectable()
export class RedisHealthIndicator {
  constructor(
    private readonly health: HealthIndicatorService,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async isHealthy(key = 'redis', timeoutMs = 2_000): Promise<HealthIndicatorResult> {
    const indicator = this.health.check(key);
    try {
      const reply: string = await withTimeout(this.redis.ping(), timeoutMs, 'redis ping');
      return reply === 'PONG'
        ? indicator.up()
        : indicator.down({ message: `Unexpected reply: ${reply}` });
    } catch (error) {
      return indicator.down({ message: (error as Error).message });
    }
  }
}
