import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@osgb/shared-types';
import { CurrentTenant, RequirePermissions } from '@/common/decorators';
import { CertificatesService } from './certificates.service';

@ApiTags('certificates')
@ApiBearerAuth()
@Controller('certificates')
export class CertificatesController {
  constructor(private readonly certificates: CertificatesService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.CERTIFICATES_READ)
  list(@CurrentTenant() tenantId: string) {
    return this.certificates.list(tenantId);
  }
}
