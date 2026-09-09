import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@osgb/shared-types';
import { CurrentTenant, RequirePermissions } from '@/common/decorators';
import { AuditQueryDto } from './audit-query.dto';
import { AuditService } from './audit.service';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.AUDIT_READ)
  list(@CurrentTenant() tenantId: string, @Query() query: AuditQueryDto) {
    return this.audit.findMany(tenantId, query);
  }
}
