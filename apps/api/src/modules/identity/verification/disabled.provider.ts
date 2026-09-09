import type { IdentityVerificationRequest, IdentityVerificationResult } from '@osgb/shared-types';
import type { CitizenVerificationProvider } from './citizen-verification.provider';

/** Used when IDENTITY_VERIFICATION_PROVIDER=none: records that no electronic check happened. */
export class DisabledVerificationProvider implements CitizenVerificationProvider {
  readonly name = 'none';

  verify(_request: IdentityVerificationRequest): Promise<IdentityVerificationResult> {
    return Promise.resolve({
      outcome: 'DISABLED',
      provider: this.name,
      checkedAt: new Date().toISOString(),
      message: 'Elektronik kimlik doğrulama devre dışı (IDENTITY_VERIFICATION_PROVIDER=none)',
    });
  }
}
