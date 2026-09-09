import { Module } from '@nestjs/common';
import { AuthModule } from '@/modules/auth/auth.module';
import { EmployeesModule } from '@/modules/employees/employees.module';
import { RadiologyController } from './radiology.controller';
import { RadiologyRepository } from './radiology.repository';
import { RadiologyService } from './radiology.service';

@Module({
  imports: [EmployeesModule, AuthModule],
  controllers: [RadiologyController],
  providers: [RadiologyService, RadiologyRepository],
  exports: [RadiologyService],
})
export class RadiologyModule {}
