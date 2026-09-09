import { Module } from '@nestjs/common';
import { CompaniesModule } from '@/modules/companies/companies.module';
import { CompanyImportsController } from './company-imports.controller';
import { CompanyImportsService } from './company-imports.service';

@Module({
  imports: [CompaniesModule],
  controllers: [CompanyImportsController],
  providers: [CompanyImportsService],
})
export class CompanyImportsModule {}
