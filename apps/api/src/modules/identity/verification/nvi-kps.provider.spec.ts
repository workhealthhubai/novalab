import type axios from 'axios';
import type { PinoLogger } from 'nestjs-pino';
import { buildKpsEnvelope, NviKpsVerificationProvider, parseKpsResponse } from './nvi-kps.provider';

describe('NviKpsVerificationProvider', () => {
  const logger = {
    setContext: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  } as unknown as PinoLogger;
  const request = {
    nationalId: '10000000146',
    firstName: 'ayşe',
    lastName: 'yılmaz',
    birthYear: 1990,
  };

  it('builds a SOAP envelope with Turkish upper-casing and escaping', () => {
    const xml = buildKpsEnvelope({ ...request, firstName: 'ay<şe' });
    expect(xml).toContain('<Ad>AY&lt;ŞE</Ad>');
    expect(xml).toContain('<Soyad>YILMAZ</Soyad>');
    expect(xml).toContain('<DogumYili>1990</DogumYili>');
  });

  it('parses true/false results and rejects unknown payloads', () => {
    expect(parseKpsResponse('<TCKimlikNoDogrulaResult>true</TCKimlikNoDogrulaResult>')).toBe(true);
    expect(parseKpsResponse('<TCKimlikNoDogrulaResult>false</TCKimlikNoDogrulaResult>')).toBe(
      false,
    );
    expect(parseKpsResponse('<html>error</html>')).toBeNull();
  });

  it.each([
    [200, '<TCKimlikNoDogrulaResult>true</TCKimlikNoDogrulaResult>', 'VERIFIED'],
    [200, '<TCKimlikNoDogrulaResult>false</TCKimlikNoDogrulaResult>', 'MISMATCH'],
    [302, '<html>moved</html>', 'UNAVAILABLE'],
  ])('maps HTTP %s to %s', async (status, body, outcome) => {
    const provider = new NviKpsVerificationProvider('https://example.invalid/kps', 1000, logger);
    const http = (provider as unknown as { http: ReturnType<typeof axios.create> }).http;
    http.defaults.adapter = async (config) => ({
      data: body,
      status,
      statusText: '',
      headers: {},
      config,
    });
    await expect(provider.verify(request)).resolves.toMatchObject({
      outcome,
      provider: 'nvi-kps-public',
    });
  });

  it('reports UNAVAILABLE on network errors', async () => {
    const provider = new NviKpsVerificationProvider('https://example.invalid/kps', 1000, logger);
    const http = (provider as unknown as { http: ReturnType<typeof axios.create> }).http;
    http.defaults.adapter = async () => {
      throw new Error('ECONNREFUSED');
    };
    await expect(provider.verify(request)).resolves.toMatchObject({ outcome: 'UNAVAILABLE' });
  });
});
