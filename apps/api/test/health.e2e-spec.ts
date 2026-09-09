import type { INestApplication } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { TransformResponseInterceptor } from '@/common/interceptors/transform-response.interceptor';
import { OrthancService } from '@/infrastructure/orthanc/orthanc.service';
import { PrismaService } from '@/infrastructure/prisma/prisma.service';
import { REDIS_CLIENT } from '@/infrastructure/redis/redis.constants';
import { StorageService } from '@/infrastructure/storage/storage.service';
import { HealthController } from '@/modules/health/health.controller';
import { MinioHealthIndicator } from '@/modules/health/indicators/minio.health';
import { OrthancHealthIndicator } from '@/modules/health/indicators/orthanc.health';
import { PrismaHealthIndicator } from '@/modules/health/indicators/prisma.health';
import { RedisHealthIndicator } from '@/modules/health/indicators/redis.health';

/**
 * HTTP-level test of the health endpoints with the infrastructure clients replaced
 * by fakes, so it runs in CI without Docker. Full-stack readiness is verified by
 * `docker compose` health checks.
 */
describe('Health endpoints (e2e)', () => {
  let app: INestApplication;
  const prisma = { ping: jest.fn().mockResolvedValue(undefined) };
  const redis = { ping: jest.fn().mockResolvedValue('PONG') };
  const storage = { bucket: 'osgb-documents', healthCheck: jest.fn().mockResolvedValue(undefined) };
  const orthanc = {
    getSystemStatus: jest.fn().mockResolvedValue({ Version: '1.12.0', DicomAet: 'OSGB' }),
  };

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TerminusModule.forRoot({ logger: false })],
      controllers: [HealthController],
      providers: [
        PrismaHealthIndicator,
        RedisHealthIndicator,
        MinioHealthIndicator,
        OrthancHealthIndicator,
        { provide: PrismaService, useValue: prisma },
        { provide: REDIS_CLIENT, useValue: redis },
        { provide: StorageService, useValue: storage },
        { provide: OrthancService, useValue: orthanc },
      ],
    }).compile();

    app = moduleRef.createNestApplication({ logger: false });
    app.setGlobalPrefix('api', { exclude: ['health', 'health/live', 'health/ready'] });
    app.useGlobalInterceptors(new TransformResponseInterceptor());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    orthanc.getSystemStatus.mockResolvedValue({ Version: '1.12.0', DicomAet: 'OSGB' });
  });

  it('GET /health/live returns the standard envelope', async () => {
    const res = await request(app.getHttpServer()).get('/health/live').expect(200);
    expect(res.body).toMatchObject({ success: true, data: { status: 'ok' } });
  });

  it('GET /health/ready reports every dependency as up', async () => {
    const res = await request(app.getHttpServer()).get('/health/ready').expect(200);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.info).toMatchObject({
      postgres: { status: 'up' },
      redis: { status: 'up' },
      minio: { status: 'up', bucket: 'osgb-documents' },
      orthanc: { status: 'up', version: '1.12.0' },
    });
  });

  it('GET /health/ready returns 503 when Orthanc is unreachable', async () => {
    orthanc.getSystemStatus.mockRejectedValue(new Error('ECONNREFUSED'));
    const res = await request(app.getHttpServer()).get('/health/ready').expect(503);
    expect(res.body.status).toBe('error');
    expect(res.body.error.orthanc.status).toBe('down');
    expect(res.body.info.postgres.status).toBe('up');
  });

  it('GET /health (alias) is served without the /api prefix', async () => {
    await request(app.getHttpServer()).get('/health').expect(200);
    await request(app.getHttpServer()).get('/api/health').expect(404);
  });
});
