import { describe, expect, it } from 'vitest';
import { organizationSchema, toFormValues } from './organization-schema';

const valid = {
  name: 'Demo OSGB',
  legalName: '',
  taxOffice: '',
  taxNumber: '',
  sgkRegistrationNumber: '',
  authorizationNumber: '',
  authorizationDate: '',
  responsibleManager: '',
  phone: '',
  fax: '',
  email: '',
  website: '',
  addressProvinceId: null,
  addressDistrictId: null,
  addressLine: '',
  reportFooter: '',
  radiologyStationAet: '',
};

describe('organization schema', () => {
  it('accepts empty optional fields and validates formats when present', () => {
    expect(organizationSchema.safeParse(valid).success).toBe(true);
    const bad = organizationSchema.safeParse({
      ...valid,
      taxNumber: '12',
      email: 'x',
      website: 'not a site',
    });
    expect(bad.success).toBe(false);
    const paths = bad.success ? [] : bad.error.issues.map((i) => i.path.join('.'));
    expect(paths).toEqual(expect.arrayContaining(['taxNumber', 'email', 'website']));
    expect(organizationSchema.safeParse({ ...valid, website: 'osgb.example.com' }).success).toBe(
      true,
    );
  });

  it('maps the API shape to form values with dates trimmed to the day', () => {
    const values = toFormValues({
      id: 't',
      name: 'Demo OSGB',
      slug: 'demo',
      status: 'ACTIVE',
      profile: {
        id: 'p',
        legalName: 'Demo OSGB Ltd. Şti.',
        taxOffice: null,
        taxNumber: null,
        sgkRegistrationNumber: null,
        authorizationNumber: 'OSGB-123',
        radiologyStationAet: 'XRAY01',
        authorizationDate: '2024-03-01T00:00:00.000Z',
        responsibleManager: null,
        phone: null,
        fax: null,
        email: null,
        website: null,
        addressProvinceId: 34,
        addressDistrictId: null,
        addressLine: null,
        reportFooter: null,
        logoUpdatedAt: null,
        addressProvince: { id: 34, name: 'İstanbul' },
        addressDistrict: null,
      },
    });
    expect(values.legalName).toBe('Demo OSGB Ltd. Şti.');
    expect(values.authorizationDate).toBe('2024-03-01');
    expect(values.addressProvinceId).toBe(34);
    expect(values.taxNumber).toBe('');
    expect(values.radiologyStationAet).toBe('XRAY01');
  });
});
