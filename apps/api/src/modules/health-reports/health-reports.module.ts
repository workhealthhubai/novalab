import { Module } from '@nestjs/common';
import { DocumentsModule } from '@/modules/documents/documents.module';
import { ProtocolsModule } from '@/modules/protocols/protocols.module';
import { HealthReportsController } from './health-reports.controller';
import { HealthReportsService } from './health-reports.service';

@Module({
  imports: [ProtocolsModule, DocumentsModule],
  controllers: [HealthReportsController],
  providers: [HealthReportsService],
})
export class HealthReportsModule {}
