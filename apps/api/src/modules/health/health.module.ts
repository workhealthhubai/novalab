import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { MinioHealthIndicator } from './indicators/minio.health';
import { OrthancHealthIndicator } from './indicators/orthanc.health';
import { PrismaHealthIndicator } from './indicators/prisma.health';
import { RedisHealthIndicator } from './indicators/redis.health';

@Module({
  imports: [TerminusModule.forRoot({ logger: false })],
  controllers: [HealthController],
  providers: [
    PrismaHealthIndicator,
    RedisHealthIndicator,
    MinioHealthIndicator,
    OrthancHealthIndicator,
  ],
})
export class HealthModule {}
