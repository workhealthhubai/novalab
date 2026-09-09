import type { IdentityVerificationRequest, IdentityVerificationResult } from '@osgb/shared-types';

export const CITIZEN_VERIFICATION_PROVIDER = Symbol('CITIZEN_VERIFICATION_PROVIDER');

/**
 * Official/second-source identity check. Implementations: NVİ KPS (public SOAP),
 * a future MERNİS/KPS institutional client (adds mother/father name checks), or none.
 */
export interface CitizenVerificationProvider {
  readonly name: string;
  verify(request: IdentityVerificationRequest): Promise<IdentityVerificationResult>;
}
