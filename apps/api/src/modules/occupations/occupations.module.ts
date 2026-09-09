import { Module } from '@nestjs/common';
import { OccupationsController } from './occupations.controller';
import { OccupationsRepository } from './occupations.repository';
import { OccupationsService } from './occupations.service';

@Module({
  controllers: [OccupationsController],
  providers: [OccupationsService, OccupationsRepository],
  exports: [OccupationsService],
})
export class OccupationsModule {}
