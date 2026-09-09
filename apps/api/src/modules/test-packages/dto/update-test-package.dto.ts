import { PartialType } from '@nestjs/swagger';
import { CreateTestPackageDto } from './create-test-package.dto';

export class UpdateTestPackageDto extends PartialType(CreateTestPackageDto) {}
