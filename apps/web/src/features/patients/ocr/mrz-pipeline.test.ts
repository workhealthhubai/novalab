import { buildTd1Mrz } from '@osgb/shared-types';
import { describe, expect, it, vi } from 'vitest';
import { recognizeVariants } from './mrz-pipeline';

const mrz = buildTd1Mrz({
  documentNumber: 'A12B34567',
  nationalId: '10000000146',
  birth: '900101',
  sex: 'F',
  expiry: '300101',
  surname: 'YILMAZ',
  givenNames: 'AYSE',
}).join('\n');

describe('recognizeVariants', () => {
  it('stops at the first variant whose MRZ is fully valid', async () => {
    const recognize = vi
      .fn()
      .mockResolvedValueOnce({ text: mrz, confidence: 88 })
      .mockResolvedValueOnce({ text: '', confidence: 0 });
    const { result, variant } = await recognizeVariants(
      [
        { name: 'band', image: 1 },
        { name: 'full', image: 2 },
      ],
      recognize,
    );
    expect(result.mrzValid).toBe(true);
    expect(result.fields.nationalId).toBe('10000000146');
    expect(variant).toBe('band');
    expect(recognize).toHaveBeenCalledTimes(1);
  });

  it('keeps the best-scoring parse when no variant is perfect', async () => {
    const recognize = vi
      .fn()
      .mockResolvedValueOnce({ text: 'HEADER TEXT ONLY', confidence: 30 })
      .mockResolvedValueOnce({ text: mrz.replace('10000000146', '10000000147'), confidence: 70 });
    const { result, variant } = await recognizeVariants(
      [
        { name: 'band', image: 1 },
        { name: 'full', image: 2 },
      ],
      recognize,
    );
    expect(variant).toBe('full');
    expect(result.mrzValid).toBe(false);
    expect(result.confidence).toBe(70);
  });
});
