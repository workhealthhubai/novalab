import { Module } from '@nestjs/common';
import { EmployeesModule } from '@/modules/employees/employees.module';
import { EmployeeImportsController } from './employee-imports.controller';
import { EmployeeImportsService } from './employee-imports.service';

@Module({
  imports: [EmployeesModule],
  controllers: [EmployeeImportsController],
  providers: [EmployeeImportsService],
})
export class EmployeeImportsModule {}
