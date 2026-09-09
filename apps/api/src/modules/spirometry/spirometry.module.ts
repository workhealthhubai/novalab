import { Module } from '@nestjs/common';
import { DocumentsModule } from '@/modules/documents/documents.module';
import { ProtocolsModule } from '@/modules/protocols/protocols.module';
import { SpirometryController } from './spirometry.controller';
import { SpirometryService } from './spirometry.service';

@Module({
  imports: [ProtocolsModule, DocumentsModule],
  controllers: [SpirometryController],
  providers: [SpirometryService],
})
export class SpirometryModule {}
