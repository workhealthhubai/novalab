import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateWorkplaceDto } from './create-workplace.dto';

export class UpdateWorkplaceDto extends PartialType(
  OmitType(CreateWorkplaceDto, ['companyId'] as const),
) {}
