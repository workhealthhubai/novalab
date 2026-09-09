import { PartialType } from '@nestjs/swagger';
import { CreatePhysicianDto } from './create-physician.dto';

export class UpdatePhysicianDto extends PartialType(CreatePhysicianDto) {}
