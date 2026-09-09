import { Inject, Injectable } from '@nestjs/common';
import type { IdentityVerificationRequest, IdentityVerificationResult } from '@osgb/shared-types';
import {
  CITIZEN_VERIFICATION_PROVIDER,
  type CitizenVerificationProvider,
} from './verification/citizen-verification.provider';

@Injectable()
export class IdentityVerificationService {
  constructor(
    @Inject(CITIZEN_VERIFICATION_PROVIDER) private readonly provider: CitizenVerificationProvider,
  ) {}

  get providerName(): string {
    return this.provider.name;
  }

  verify(request: IdentityVerificationRequest): Promise<IdentityVerificationResult> {
    return this.provider.verify(request);
  }
}
