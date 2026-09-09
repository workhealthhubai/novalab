import { Module } from '@nestjs/common';
import { CompaniesModule } from '@/modules/companies/companies.module';
import { IdentityModule } from '@/modules/identity/identity.module';
import { LocationsModule } from '@/modules/locations/locations.module';
import { OccupationsModule } from '@/modules/occupations/occupations.module';
import { EmployeesController } from './employees.controller';
import { EmployeesRepository } from './employees.repository';
import { EmployeesService } from './employees.service';

@Module({
  imports: [CompaniesModule, LocationsModule, IdentityModule, OccupationsModule],
  controllers: [EmployeesController],
  providers: [EmployeesService, EmployeesRepository],
  exports: [EmployeesService, EmployeesRepository],
})
export class EmployeesModule {}
