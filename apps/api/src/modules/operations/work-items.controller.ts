import { Controller, Get, Query } from '@nestjs/common';
import { PERMISSIONS } from '@osgb/shared-types';
import { CurrentTenant, MedicalData, RequirePermissions } from '@/common/decorators';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';
import { WorkItemsService } from './work-items.service';

@Controller('work-items')
export class WorkItemsController {
  constructor(private readonly service: WorkItemsService) {}
  @Get('pending')
  @RequirePermissions(PERMISSIONS.PROTOCOLS_READ)
  pending(@CurrentTenant() tenantId: string, @Query() query: PaginationQueryDto) {
    return this.service.pending(tenantId, query);
  }
  @Get('reports')
  @MedicalData({ entityType: 'Examination' })
  @RequirePermissions(PERMISSIONS.EXAMINATIONS_READ)
  reports(@CurrentTenant() tenantId: string, @Query() query: PaginationQueryDto) {
    return this.service.reports(tenantId, query);
  }
  @Get('missing')
  @RequirePermissions(PERMISSIONS.EMPLOYEES_READ)
  missing(@CurrentTenant() tenantId: string, @Query() query: PaginationQueryDto) {
    return this.service.missing(tenantId, query);
  }
}
