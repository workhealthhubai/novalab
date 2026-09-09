import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS } from '@osgb/shared-types';
import { RequireAnyPermission, SkipAudit } from '@/common/decorators';
import { VerifyIdentityDto } from './dto/verify-identity.dto';
import { IdentityVerificationService } from './identity-verification.service';
import { BarcodeService } from './ocr/barcode.service';
import { IdCardOcrService } from './ocr/id-card-ocr.service';

const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/bmp']);

interface UploadedImage {
  mimetype: string;
  size: number;
  buffer: Buffer;
}

@ApiTags('identity')
@ApiBearerAuth()
@Controller('identity')
export class IdentityController {
  constructor(
    private readonly ocr: IdCardOcrService,
    private readonly barcodes: BarcodeService,
    private readonly verification: IdentityVerificationService,
  ) {}

  /** The scanned image is personal data: it is processed in memory and never stored or audited. */
  @Post('scan')
  @HttpCode(HttpStatus.OK)
  @SkipAudit()
  @RequireAnyPermission(PERMISSIONS.EMPLOYEES_CREATE, PERMISSIONS.EMPLOYEES_UPDATE)
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: MAX_IMAGE_BYTES, files: 1 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { image: { type: 'string', format: 'binary' } },
      required: ['image'],
    },
  })
  @ApiOperation({
    summary: 'Read the MRZ of an ID card photo (OCR) and return the extracted fields',
  })
  scan(@UploadedFile() image: UploadedImage | undefined) {
    if (!image)
      throw new BadRequestException({ message: 'Missing image', errorCode: 'IMAGE_REQUIRED' });
    if (!IMAGE_TYPES.has(image.mimetype)) {
      throw new BadRequestException({
        message: `Unsupported image type: ${image.mimetype}`,
        errorCode: 'UNSUPPORTED_IMAGE_TYPE',
      });
    }
    return this.ocr.scan(image.buffer);
  }

  /** Barcode-only read (close-up of the card's barcode); nothing is stored or audited. */
  @Post('barcode')
  @HttpCode(HttpStatus.OK)
  @SkipAudit()
  @RequireAnyPermission(PERMISSIONS.EMPLOYEES_CREATE, PERMISSIONS.EMPLOYEES_UPDATE)
  @UseInterceptors(FileInterceptor('image', { limits: { fileSize: MAX_IMAGE_BYTES, files: 1 } }))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { image: { type: 'string', format: 'binary' } },
      required: ['image'],
    },
  })
  @ApiOperation({ summary: 'Decode the barcode on an ID card photo' })
  async barcode(@UploadedFile() image: UploadedImage | undefined) {
    if (!image)
      throw new BadRequestException({ message: 'Missing image', errorCode: 'IMAGE_REQUIRED' });
    if (!IMAGE_TYPES.has(image.mimetype)) {
      throw new BadRequestException({
        message: `Unsupported image type: ${image.mimetype}`,
        errorCode: 'UNSUPPORTED_IMAGE_TYPE',
      });
    }
    return { barcode: await this.barcodes.read(image.buffer) };
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @RequireAnyPermission(PERMISSIONS.EMPLOYEES_CREATE, PERMISSIONS.EMPLOYEES_UPDATE)
  @ApiOperation({
    summary: 'Verify TC Kimlik No + name + birth year against the configured official source',
  })
  verify(@Body() dto: VerifyIdentityDto) {
    return this.verification.verify(dto);
  }
}
