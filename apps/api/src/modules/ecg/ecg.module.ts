import { Module } from '@nestjs/common';
import { DocumentsModule } from '@/modules/documents/documents.module';
import { ProtocolsModule } from '@/modules/protocols/protocols.module';
import { EcgController } from './ecg.controller';
import { EcgService } from './ecg.service';

@Module({
  imports: [ProtocolsModule, DocumentsModule],
  controllers: [EcgController],
  providers: [EcgService],
})
export class EcgModule {}
