import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@osgb/shared-types';
import { CurrentTenant, RequirePermissions } from '@/common/decorators';
import { ActivityQueryDto, ActivitySummaryQueryDto, AuditQueryDto } from './audit-query.dto';
import { AuditService } from './audit.service';

@ApiTags('audit')
@ApiBearerAuth()
@Controller('audit')
export class AuditController {
  constructor(private readonly audit: AuditService) {}

  @Get('activity')
  @RequirePermissions(PERMISSIONS.AUDIT_READ)
  @ApiOperation({ summary: 'Business activity with resolved entity labels (Personel Hareketleri)' })
  activity(@CurrentTenant() tenantId: string, @Query() query: ActivityQueryDto) {
    return this.audit.activity(tenantId, query);
  }

  @Get('activity/summary')
  @RequirePermissions(PERMISSIONS.AUDIT_READ)
  @ApiOperation({ summary: 'Per-user activity counts by category for a period' })
  activitySummary(@CurrentTenant() tenantId: string, @Query() query: ActivitySummaryQueryDto) {
    return this.audit.activitySummary(tenantId, query);
  }

  @Get()
  @RequirePermissions(PERMISSIONS.AUDIT_READ)
  list(@CurrentTenant() tenantId: string, @Query() query: AuditQueryDto) {
    return this.audit.findMany(tenantId, query);
  }
}
