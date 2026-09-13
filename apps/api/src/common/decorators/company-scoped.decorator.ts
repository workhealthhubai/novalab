import { SetMetadata } from '@nestjs/common';

export const COMPANY_SCOPE_KEY = 'company-scope';
/** Mark only handlers that enforce the authenticated company scope in their database reads. */
export const CompanyScoped = () => SetMetadata(COMPANY_SCOPE_KEY, 'scoped');
/** Authentication/self-profile handlers that expose no business records. */
export const CompanySelfAccess = () => SetMetadata(COMPANY_SCOPE_KEY, 'self');
