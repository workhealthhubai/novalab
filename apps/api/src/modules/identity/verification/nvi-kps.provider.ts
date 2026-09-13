import axios, { type AxiosInstance } from 'axios';
import type { PinoLogger } from 'nestjs-pino';
import {
  type IdentityVerificationRequest,
  type IdentityVerificationResult,
  toTurkishUpper,
} from '@osgb/shared-types';
import type { CitizenVerificationProvider } from './citizen-verification.provider';

const SOAP_ACTION = 'http://tckimlik.nvi.gov.tr/WS/TCKimlikNoDogrula';

function escapeXml(value: string): string {
  return value.replace(
    /[<>&'"]/g,
    (char) =>
      ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[char] ?? char,
  );
}

export function buildKpsEnvelope(request: IdentityVerificationRequest): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <TCKimlikNoDogrula xmlns="http://tckimlik.nvi.gov.tr/WS">
      <TCKimlikNo>${escapeXml(request.nationalId)}</TCKimlikNo>
      <Ad>${escapeXml(toTurkishUpper(request.firstName))}</Ad>
      <Soyad>${escapeXml(toTurkishUpper(request.lastName))}</Soyad>
      <DogumYili>${request.birthYear}</DogumYili>
    </TCKimlikNoDogrula>
  </soap:Body>
</soap:Envelope>`;
}

export function parseKpsResponse(xml: string): boolean | null {
  const match = /<TCKimlikNoDogrulaResult>\s*(true|false)\s*<\/TCKimlikNoDogrulaResult>/i.exec(xml);
  return match ? match[1]!.toLowerCase() === 'true' : null;
}

/**
 * NVİ "KPS Public" SOAP service: confirms that TC Kimlik No + name + surname + birth year match
 * the civil registry. It does not expose mother/father names; those remain MANUAL checks.
 */
export class NviKpsVerificationProvider implements CitizenVerificationProvider {
  readonly name = 'nvi-kps-public';
  private readonly http: AxiosInstance;

  constructor(
    url: string,
    timeoutMs: number,
    private readonly logger: PinoLogger,
  ) {
    this.http = axios.create({
      baseURL: url,
      timeout: timeoutMs,
      maxRedirects: 0,
      headers: {
        'Content-Type': 'text/xml; charset=utf-8',
        SOAPAction: `"${SOAP_ACTION}"`,
        'User-Agent': 'osgb-platform/0.1',
      },
      validateStatus: () => true,
    });
  }

  async verify(request: IdentityVerificationRequest): Promise<IdentityVerificationResult> {
    const checkedAt = new Date().toISOString();
    const startedAt = Date.now();
    try {
      const response = await this.http.post<string>('', buildKpsEnvelope(request), {
        responseType: 'text',
      });
      const verdict = response.status === 200 ? parseKpsResponse(response.data) : null;
      this.logger.info(
        {
          status: response.status,
          durationMs: Date.now() - startedAt,
          verdict,
        },
        'NVI KPS verification',
      );
      if (verdict === null) {
        return {
          outcome: 'UNAVAILABLE',
          provider: this.name,
          checkedAt,
          message: `NVİ servisi beklenmeyen yanıt verdi (HTTP ${response.status})`,
        };
      }
      return verdict
        ? { outcome: 'VERIFIED', provider: this.name, checkedAt }
        : {
            outcome: 'MISMATCH',
            provider: this.name,
            checkedAt,
            message: 'TC Kimlik No, ad, soyad ve doğum yılı nüfus kaydıyla eşleşmiyor',
          };
    } catch (error) {
      this.logger.error(
        { err: error, durationMs: Date.now() - startedAt },
        'NVI KPS verification failed',
      );
      return {
        outcome: 'UNAVAILABLE',
        provider: this.name,
        checkedAt,
        message: 'NVİ servisine ulaşılamadı',
      };
    }
  }
}
