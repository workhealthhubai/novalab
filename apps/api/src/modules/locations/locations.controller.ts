import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { LocationsService } from './locations.service';

@ApiTags('locations')
@ApiBearerAuth()
@Controller('locations')
export class LocationsController {
  constructor(private readonly locations: LocationsService) {}

  @Get('provinces')
  provinces() {
    return this.locations.provinces();
  }

  @Get('provinces/:provinceId/districts')
  districts(@Param('provinceId', ParseIntPipe) provinceId: number) {
    return this.locations.districts(provinceId);
  }

  @Get('districts/:districtId/neighborhoods')
  neighborhoods(@Param('districtId', ParseIntPipe) districtId: number) {
    return this.locations.neighborhoods(districtId);
  }
}
