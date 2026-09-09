import { Module } from '@nestjs/common';
import { CompaniesModule } from '@/modules/companies/companies.module';
import { EmployeesModule } from '@/modules/employees/employees.module';
import { ProtocolsController } from './protocols.controller';
import { ProtocolsRepository } from './protocols.repository';
import { ProtocolsService } from './protocols.service';

@Module({
  imports: [EmployeesModule, CompaniesModule],
  controllers: [ProtocolsController],
  providers: [ProtocolsService, ProtocolsRepository],
  exports: [ProtocolsService],
})
export class ProtocolsModule {}
