import { Module } from '@nestjs/common';
import { ConsentsModule } from '@/modules/consents/consents.module';
import { DocumentsModule } from '@/modules/documents/documents.module';
import { SignaturesController } from './signatures.controller';
import { SignaturesService } from './signatures.service';

@Module({
  imports: [DocumentsModule, ConsentsModule],
  controllers: [SignaturesController],
  providers: [SignaturesService],
})
export class SignaturesModule {}
