import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CompanyScoped } from '@/common/decorators/company-scoped.decorator';
import { CurrentUser } from '@/common/decorators';
import type { AuthenticatedUser } from '@/common/interfaces';
import { OperationsService } from './operations.service';
import { OperationQueryDto, SaveOperationDto } from './operations.dto';

@ApiTags('operations')
@ApiBearerAuth()
@Controller('operations')
export class OperationsController {
  constructor(private readonly service: OperationsService) {}
  @CompanyScoped()
  @Get('dashboard')
  dashboard(@CurrentUser() actor: AuthenticatedUser) {
    return this.service.dashboard(actor);
  }
  @Get(':kind') list(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('kind') kind: string,
    @Query() q: OperationQueryDto,
  ) {
    return this.service.list(actor, kind, q);
  }
  @Get(':kind/summary') summary(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('kind') kind: string,
    @Query() q: OperationQueryDto,
  ) {
    return this.service.summary(actor, kind, q);
  }
  @Get(':kind/options/:field') options(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('kind') kind: string,
    @Param('field') field: string,
    @Query() q: OperationQueryDto,
  ) {
    return this.service.options(actor, kind, field, q.search);
  }
  @Post(':kind') create(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('kind') kind: string,
    @Body() dto: SaveOperationDto,
  ) {
    return this.service.save(actor, kind, dto);
  }
  @Put(':kind/:id') update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('kind') kind: string,
    @Param('id', new ParseUUIDPipe()) id: string,
    @Body() dto: SaveOperationDto,
  ) {
    return this.service.save(actor, kind, dto, id);
  }
  @Delete(':kind/:id') remove(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('kind') kind: string,
    @Param('id', new ParseUUIDPipe()) id: string,
  ) {
    return this.service.remove(actor, kind, id);
  }
}

