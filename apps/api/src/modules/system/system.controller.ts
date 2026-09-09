import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@osgb/shared-types';
import { RequirePermissions } from '@/common/decorators';
import { SystemService } from './system.service';

@ApiTags('system')
@ApiBearerAuth()
@RequirePermissions(PERMISSIONS.SYSTEM_MANAGE)
@Controller('system')
export class SystemController {
  constructor(private readonly system: SystemService) {}

  @Get('info')
  info() {
    return this.system.info();
  }

  @Get('queues')
  queues() {
    return this.system.queues();
  }
}
