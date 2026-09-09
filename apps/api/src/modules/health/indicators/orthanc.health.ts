import { Injectable } from '@nestjs/common';
import { HealthIndicatorService, type HealthIndicatorResult } from '@nestjs/terminus';
import { withTimeout } from '@/common/utils/with-timeout';
import { OrthancService } from '@/infrastructure/orthanc/orthanc.service';

@Injectable()
export class OrthancHealthIndicator {
  constructor(
    private readonly health: HealthIndicatorService,
    private readonly orthanc: OrthancService,
  ) {}

  async isHealthy(key = 'orthanc', timeoutMs = 3_000): Promise<HealthIndicatorResult> {
    const indicator = this.health.check(key);
    try {
      const info = await withTimeout(this.orthanc.getSystemStatus(), timeoutMs, 'orthanc check');
      return indicator.up({ version: info.Version, aet: info.DicomAet });
    } catch (error) {
      return indicator.down({ message: (error as Error).message });
    }
  }
}
