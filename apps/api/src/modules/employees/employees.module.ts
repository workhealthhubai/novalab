import { Module } from '@nestjs/common';
import { CompaniesModule } from '@/modules/companies/companies.module';
import { IdentityModule } from '@/modules/identity/identity.module';
import { LocationsModule } from '@/modules/locations/locations.module';
import { EmployeesController } from './employees.controller';
import { EmployeesRepository } from './employees.repository';
import { EmployeesService } from './employees.service';

@Module({
  imports: [CompaniesModule, LocationsModule, IdentityModule],
  controllers: [EmployeesController],
  providers: [EmployeesService, EmployeesRepository],
  exports: [EmployeesService, EmployeesRepository],
})
export class EmployeesModule {}
