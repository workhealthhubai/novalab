import { Module } from '@nestjs/common';
import { ProtocolsModule } from '@/modules/protocols/protocols.module';
import { EyeController } from './eye.controller';
import { EyeService } from './eye.service';

@Module({
  imports: [ProtocolsModule],
  controllers: [EyeController],
  providers: [EyeService],
})
export class EyeModule {}
