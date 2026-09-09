import { Module } from '@nestjs/common';
import { ProtocolsModule } from '@/modules/protocols/protocols.module';
import { PneumoconiosisController } from './pneumoconiosis.controller';
import { PneumoconiosisService } from './pneumoconiosis.service';

@Module({
  imports: [ProtocolsModule],
  controllers: [PneumoconiosisController],
  providers: [PneumoconiosisService],
})
export class PneumoconiosisModule {}
