import { resolve } from 'node:path';
import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule, seconds } from '@nestjs/throttler';
import { HttpExceptionFilter } from '@/common/filters/http-exception.filter';
import { JwtAuthGuard, MedicalDataGuard, PermissionsGuard } from '@/common/guards';
import { AuditInterceptor } from '@/common/interceptors/audit.interceptor';
import { TransformResponseInterceptor } from '@/common/interceptors/transform-response.interceptor';
import { type AppConfig, configuration } from '@/config/configuration';
import { LoggerModule } from '@/infrastructure/logger/logger.module';
import { OrthancModule } from '@/infrastructure/orthanc/orthanc.module';
import { PrismaModule } from '@/infrastructure/prisma/prisma.module';
import { QueueModule } from '@/infrastructure/queue/queue.module';
import { RedisModule } from '@/infrastructure/redis/redis.module';
import { StorageModule } from '@/infrastructure/storage/storage.module';
import { AppointmentsModule } from '@/modules/appointments/appointments.module';
import { AuditModule } from '@/modules/audit/audit.module';
import { AuthModule } from '@/modules/auth/auth.module';
import { BranchesModule } from '@/modules/branches/branches.module';
import { CertificatesModule } from '@/modules/certificates/certificates.module';
import { CompaniesModule } from '@/modules/companies/companies.module';
import { AudiometryModule } from '@/modules/audiometry/audiometry.module';
import { CompanyImportsModule } from '@/modules/company-imports/company-imports.module';
import { ConsentsModule } from '@/modules/consents/consents.module';
import { DocumentsModule } from '@/modules/documents/documents.module';
import { EcgModule } from '@/modules/ecg/ecg.module';
import { EyeModule } from '@/modules/eye/eye.module';
import { EmployeeImportsModule } from '@/modules/employee-imports/employee-imports.module';
import { EmployeesModule } from '@/modules/employees/employees.module';
import { ExaminationsModule } from '@/modules/examinations/examinations.module';
import { HealthReportsModule } from '@/modules/health-reports/health-reports.module';
import { HealthModule } from '@/modules/health/health.module';
import { IdentityModule } from '@/modules/identity/identity.module';
import { LocationsModule } from '@/modules/locations/locations.module';
import { NotificationsModule } from '@/modules/notifications/notifications.module';
import { OccupationsModule } from '@/modules/occupations/occupations.module';
import { OrganizationModule } from '@/modules/organization/organization.module';
import { PermissionsModule } from '@/modules/permissions/permissions.module';
import { PneumoconiosisModule } from '@/modules/pneumoconiosis/pneumoconiosis.module';
import { PhysiciansModule } from '@/modules/physicians/physicians.module';
import { ProtocolsModule } from '@/modules/protocols/protocols.module';
import { RadiologyModule } from '@/modules/radiology/radiology.module';
import { RolesModule } from '@/modules/roles/roles.module';
import { SpirometryModule } from '@/modules/spirometry/spirometry.module';
import { SignaturesModule } from '@/modules/signatures/signatures.module';
import { SessionsModule } from '@/modules/sessions/sessions.module';
import { SystemModule } from '@/modules/system/system.module';
import { TenantsModule } from '@/modules/tenants/tenants.module';
import { TestPackagesModule } from '@/modules/test-packages/test-packages.module';
import { TestsModule } from '@/modules/tests/tests.module';
import { TrainingsModule } from '@/modules/trainings/trainings.module';
import { UsersModule } from '@/modules/users/users.module';
import { WorkplacesModule } from '@/modules/workplaces/workplaces.module';

/**
 * Modular monolith root. Cross-cutting concerns (config, logging, database,
 * cache/queue, storage, PACS, audit) are global; business modules are isolated
 * and communicate through their exported services.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [configuration],
      // Monorepo layout: the .env file lives at the repository root.
      envFilePath: [resolve(process.cwd(), '.env'), resolve(process.cwd(), '../../.env')],
    }),
    LoggerModule,
    ThrottlerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService<AppConfig, true>) => {
        const { ttlSeconds, limit } = config.get('rateLimit', { infer: true });
        return { throttlers: [{ name: 'default', ttl: seconds(ttlSeconds), limit }] };
      },
    }),

    // Infrastructure
    PrismaModule,
    RedisModule,
    StorageModule,
    OrthancModule,
    QueueModule,

    // Cross-cutting domain
    AuditModule,
    HealthModule,
    SystemModule,

    // IAM
    AuthModule,
    UsersModule,
    TenantsModule,
    OrganizationModule,
    RolesModule,
    PermissionsModule,

    // Business
    CompaniesModule,
    BranchesModule,
    WorkplacesModule,
    EmployeesModule,
    EmployeeImportsModule,
    CompanyImportsModule,
    LocationsModule,
    IdentityModule,
    ExaminationsModule,
    ProtocolsModule,
    PhysiciansModule,
    TestsModule,
    TestPackagesModule,
    OccupationsModule,
    SessionsModule,
    ConsentsModule,
    SignaturesModule,
    AudiometryModule,
    EcgModule,
    SpirometryModule,
    EyeModule,
    PneumoconiosisModule,
    HealthReportsModule,
    RadiologyModule,
    AppointmentsModule,
    TrainingsModule,
    CertificatesModule,
    DocumentsModule,
    NotificationsModule,
  ],
  providers: [
    // Guard order matters: rate limit -> authentication -> permissions -> medical data policy.
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_GUARD, useClass: MedicalDataGuard },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_INTERCEPTOR, useClass: TransformResponseInterceptor },
    // Automatic audit trail for every authenticated mutating request.
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
