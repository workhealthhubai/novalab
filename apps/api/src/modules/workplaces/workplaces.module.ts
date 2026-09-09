import { Module } from '@nestjs/common';
import { CompaniesModule } from '@/modules/companies/companies.module';
import { WorkplacesController } from './workplaces.controller';
import { WorkplacesRepository } from './workplaces.repository';
import { WorkplacesService } from './workplaces.service';

@Module({
  imports: [CompaniesModule],
  controllers: [WorkplacesController],
  providers: [WorkplacesService, WorkplacesRepository],
  exports: [WorkplacesService],
})
export class WorkplacesModule {}
