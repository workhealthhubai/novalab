import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { documentExpiryWhere } from './document-expiry';
import { UpdateDocumentExpiryDto } from './dto/update-document-expiry.dto';
import { DocumentsService } from './documents.service';
import type { AuthenticatedUser } from '@/common/interfaces';

describe('document expiry', () => {
  const now = new Date('2026-09-12T22:30:00Z');
  it('treats today as unexpired in Istanbul and includes the end of the requested window', () => {
    expect(documentExpiryWhere('30', now)).toEqual({
      expiresAt: { gte: new Date('2026-09-13'), lte: new Date('2026-10-13') },
    });
    expect(documentExpiryWhere('overdue', now)).toEqual({
      expiresAt: { lt: new Date('2026-09-13') },
    });
    expect(documentExpiryWhere('undated', now)).toEqual({ expiresAt: null });
  });
  it.each([{}, { expiresAt: '2026-02-30' }, { expiresAt: '2026-09-13T12:00:00Z' }])(
    'rejects missing or invalid calendar dates (%j)',
    async (input) => {
      expect(
        (await validate(plainToInstance(UpdateDocumentExpiryDto, input))).length,
      ).toBeGreaterThan(0);
    },
  );
  it.each([{ expiresAt: null }, { expiresAt: '2026-09-13' }])(
    'accepts an explicit clear or calendar date (%j)',
    async (input) => {
      expect(await validate(plainToInstance(UpdateDocumentExpiryDto, input))).toHaveLength(0);
    },
  );
  it('prevents editing medical metadata without medical access', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue({ isMedical: true }),
      updateExpiry: jest.fn(),
    };
    const service = new DocumentsService(
      repository as never,
      {} as never,
      {} as never,
      {} as never,
    );
    await expect(
      service.updateExpiry(
        'tenant',
        { permissions: [] } as unknown as AuthenticatedUser,
        'doc',
        null,
        {},
      ),
    ).rejects.toThrow('Medical document access denied');
    expect(repository.updateExpiry).not.toHaveBeenCalled();
  });
});
