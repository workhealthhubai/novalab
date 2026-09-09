import { Injectable } from '@nestjs/common';
import { HealthIndicatorService, type HealthIndicatorResult } from '@nestjs/terminus';
import { withTimeout } from '@/common/utils/with-timeout';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';

@Injectable()
export class PrismaHealthIndicator {
  constructor(
    private readonly health: HealthIndicatorService,
    private readonly prisma: PrismaService,
  ) {}

  async isHealthy(key = 'postgres', timeoutMs = 2_000): Promise<HealthIndicatorResult> {
    const indicator = this.health.check(key);
    try {
      await withTimeout(this.prisma.ping(), timeoutMs, 'postgres ping');
      return indicator.up();
    } catch (error) {
      return indicator.down({ message: (error as Error).message });
    }
  }
}
