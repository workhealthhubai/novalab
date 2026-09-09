import { buildTd1Mrz, type IdCardScanResult, parseTd1Mrz, selectBestMrz } from '@osgb/shared-types';
import { describe, expect, it, vi } from 'vitest';
import { scanIdCardHybrid } from './hybrid-scanner';

const file = new File(['x'], 'card.jpg', { type: 'image/jpeg' });

const validMrz = buildTd1Mrz({
  documentNumber: 'A12B34567',
  nationalId: '10000000146',
  birth: '900101',
  sex: 'F',
  expiry: '300101',
  surname: 'YILMAZ',
  givenNames: 'AYSE',
});

/** A genuinely valid parse (every check digit passes) or an empty one. */
function result({ valid }: { valid: boolean }): IdCardScanResult {
  return valid ? parseTd1Mrz(validMrz) : selectBestMrz('');
}

describe('scanIdCardHybrid', () => {
  it('returns the browser result without touching the API when it is fully valid', async () => {
    const client = vi.fn().mockResolvedValue(result({ valid: true }));
    const server = vi.fn();
    const out = await scanIdCardHybrid(file, {
      mode: 'hybrid',
      clientSupported: true,
      client,
      server,
    });
    expect(out.engine).toBe('client');
    expect(server).not.toHaveBeenCalled();
  });

  it('falls back to the API when the browser result is weak and keeps the better one', async () => {
    const client = vi.fn().mockResolvedValue(result({ valid: false }));
    const server = vi.fn().mockResolvedValue(result({ valid: true }));
    const out = await scanIdCardHybrid(file, {
      mode: 'hybrid',
      clientSupported: true,
      client,
      server,
    });
    expect(server).toHaveBeenCalledWith(file);
    expect(out.engine).toBe('server');
  });

  it('keeps a weak browser result when the API is not allowed yet (early auto-scan frames)', async () => {
    const client = vi.fn().mockResolvedValue(result({ valid: false }));
    const server = vi.fn();
    const out = await scanIdCardHybrid(file, {
      mode: 'hybrid',
      clientSupported: true,
      allowServer: false,
      client,
      server,
    });
    expect(out.engine).toBe('client');
    expect(server).not.toHaveBeenCalled();
  });

  it('uses the API when the browser runtime fails to load', async () => {
    const client = vi.fn().mockRejectedValue(new Error('wasm blocked'));
    const server = vi.fn().mockResolvedValue(result({ valid: true }));
    const out = await scanIdCardHybrid(file, {
      mode: 'hybrid',
      clientSupported: true,
      client,
      server,
    });
    expect(out.engine).toBe('server');
  });

  it('goes straight to the API when unsupported or in server mode, and never in client mode', async () => {
    const client = vi.fn().mockResolvedValue(result({ valid: false }));
    const server = vi.fn().mockResolvedValue(result({ valid: true }));
    await scanIdCardHybrid(file, { mode: 'hybrid', clientSupported: false, client, server });
    expect(client).not.toHaveBeenCalled();
    await scanIdCardHybrid(file, { mode: 'server', clientSupported: true, client, server });
    expect(client).not.toHaveBeenCalled();
    server.mockClear();
    const out = await scanIdCardHybrid(file, {
      mode: 'client',
      clientSupported: true,
      client,
      server,
    });
    expect(out.engine).toBe('client');
    expect(server).not.toHaveBeenCalled();
  });
});
