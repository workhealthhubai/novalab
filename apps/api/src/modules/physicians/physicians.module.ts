import { Module } from '@nestjs/common';
import { PhysiciansController } from './physicians.controller';
import { PhysiciansRepository } from './physicians.repository';
import { PhysiciansService } from './physicians.service';

@Module({
  controllers: [PhysiciansController],
  providers: [PhysiciansService, PhysiciansRepository],
  exports: [PhysiciansService],
})
export class PhysiciansModule {}
