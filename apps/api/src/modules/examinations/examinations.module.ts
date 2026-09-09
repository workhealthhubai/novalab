import { Module } from '@nestjs/common';
import { EmployeesModule } from '@/modules/employees/employees.module';
import { ExaminationsController } from './examinations.controller';
import { ExaminationsRepository } from './examinations.repository';
import { ExaminationsService } from './examinations.service';

@Module({
  imports: [EmployeesModule],
  controllers: [ExaminationsController],
  providers: [ExaminationsService, ExaminationsRepository],
  exports: [ExaminationsService, ExaminationsRepository],
})
export class ExaminationsModule {}
