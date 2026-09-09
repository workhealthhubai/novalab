import { Module } from '@nestjs/common';
import { ProtocolsModule } from '@/modules/protocols/protocols.module';
import { AudiometryController } from './audiometry.controller';
import { AudiometryService } from './audiometry.service';

@Module({
  imports: [ProtocolsModule],
  controllers: [AudiometryController],
  providers: [AudiometryService],
})
export class AudiometryModule {}
