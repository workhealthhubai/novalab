import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import type { AppConfig } from '@/config/configuration';
import { IdentityController } from './identity.controller';
import { IdentityVerificationService } from './identity-verification.service';
import { BarcodeService } from './ocr/barcode.service';
import { IdCardOcrService } from './ocr/id-card-ocr.service';
import {
  CITIZEN_VERIFICATION_PROVIDER,
  type CitizenVerificationProvider,
} from './verification/citizen-verification.provider';
import { DisabledVerificationProvider } from './verification/disabled.provider';
import { NviKpsVerificationProvider } from './verification/nvi-kps.provider';

/**
 * Identity capture & verification: OCR of ID cards (MRZ) and official citizen verification.
 * Both sit behind small interfaces so hardware readers or other registries can be plugged in.
 */
@Module({
  controllers: [IdentityController],
  providers: [
    BarcodeService,
    IdCardOcrService,
    IdentityVerificationService,
    {
      provide: CITIZEN_VERIFICATION_PROVIDER,
      inject: [ConfigService, PinoLogger],
      useFactory: (
        config: ConfigService<AppConfig, true>,
        logger: PinoLogger,
      ): CitizenVerificationProvider => {
        const identity = config.get('identity', { infer: true });
        if (identity.verificationProvider === 'nvi') {
          logger.setContext(NviKpsVerificationProvider.name);
          return new NviKpsVerificationProvider(
            identity.nviKpsUrl,
            identity.nviKpsTimeoutMs,
            logger,
          );
        }
        return new DisabledVerificationProvider();
      },
    },
  ],
  exports: [IdCardOcrService, IdentityVerificationService],
})
export class IdentityModule {}
