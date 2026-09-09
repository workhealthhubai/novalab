import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { SkipThrottle } from '@nestjs/throttler';
import { Public } from '@/common/decorators';
import { MinioHealthIndicator } from './indicators/minio.health';
import { OrthancHealthIndicator } from './indicators/orthanc.health';
import { PrismaHealthIndicator } from './indicators/prisma.health';
import { RedisHealthIndicator } from './indicators/redis.health';

/**
 * Health endpoints are served WITHOUT the global API prefix (see main.ts) so
 * that Docker/Kubernetes probes can hit `/health/live` and `/health/ready`.
 */
@ApiTags('health')
@Public()
@SkipThrottle()
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prisma: PrismaHealthIndicator,
    private readonly redis: RedisHealthIndicator,
    private readonly minio: MinioHealthIndicator,
    private readonly orthanc: OrthancHealthIndicator,
  ) {}

  @Get()
  @HealthCheck()
  @ApiOperation({ summary: 'Overall health (all dependencies)' })
  check() {
    return this.readiness();
  }

  @Get('live')
  @ApiOperation({ summary: 'Liveness probe - process is up' })
  live() {
    return {
      status: 'ok',
      uptime: Math.round(process.uptime()),
      timestamp: new Date().toISOString(),
    };
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe - PostgreSQL, Redis, MinIO and Orthanc reachable' })
  readiness() {
    return this.health.check([
      () => this.prisma.isHealthy('postgres'),
      () => this.redis.isHealthy('redis'),
      () => this.minio.isHealthy('minio'),
      () => this.orthanc.isHealthy('orthanc'),
    ]);
  }
}
