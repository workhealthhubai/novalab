import { Controller, Get } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@osgb/shared-types';
import { CurrentTenant, RequirePermissions } from '@/common/decorators';
import { TrainingsService } from './trainings.service';

@ApiTags('trainings')
@ApiBearerAuth()
@Controller('trainings')
export class TrainingsController {
  constructor(private readonly trainings: TrainingsService) {}

  @Get()
  @RequirePermissions(PERMISSIONS.TRAININGS_READ)
  list(@CurrentTenant() tenantId: string) {
    return this.trainings.list(tenantId);
  }
}
