import { Injectable } from '@nestjs/common';
import { HealthIndicatorService, type HealthIndicatorResult } from '@nestjs/terminus';
import { withTimeout } from '@/common/utils/with-timeout';
import { StorageService } from '@/infrastructure/storage/storage.service';

@Injectable()
export class MinioHealthIndicator {
  constructor(
    private readonly health: HealthIndicatorService,
    private readonly storage: StorageService,
  ) {}

  async isHealthy(key = 'minio', timeoutMs = 3_000): Promise<HealthIndicatorResult> {
    const indicator = this.health.check(key);
    try {
      await withTimeout(this.storage.healthCheck(), timeoutMs, 'minio check');
      return indicator.up({ bucket: this.storage.bucket });
    } catch (error) {
      return indicator.down({ message: (error as Error).message });
    }
  }
}
