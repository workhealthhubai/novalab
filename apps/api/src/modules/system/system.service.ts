import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AppConfig } from '@/config/configuration';
import { QueueService } from '@/infrastructure/queue/queue.service';

@Injectable()
export class SystemService {
  constructor(
    private readonly config: ConfigService<AppConfig, true>,
    private readonly queue: QueueService,
  ) {}

  info() {
    return {
      name: this.config.get('app', { infer: true }).name,
      environment: this.config.get('env', { infer: true }),
      version: process.env.npm_package_version ?? '0.1.0',
      node: process.version,
      uptimeSeconds: Math.round(process.uptime()),
      memory: process.memoryUsage().rss,
      timestamp: new Date().toISOString(),
    };
  }

  queues() {
    return this.queue.getStats();
  }
}
