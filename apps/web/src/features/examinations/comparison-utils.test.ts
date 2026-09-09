import { describe, expect, it } from 'vitest';
import { flagOf, formatDelta, formatMeasurement, itemsProgress } from './comparison-utils';

describe('comparison utils', () => {
  it('formats values with catalogue decimals and units', () => {
    expect(formatMeasurement('WEIGHT', 80.5)).toBe('80,5 kg');
    expect(formatMeasurement('HEIGHT', 175)).toBe('175 cm');
    expect(formatMeasurement('VISION_RIGHT', 1)).toBe('1,0');
  });

  it('formats signed deltas and hides zero / missing', () => {
    expect(formatDelta('WEIGHT', 80, 82.5)).toBe('+2,5');
    expect(formatDelta('PULSE', 80, 72)).toBe('−8');
    expect(formatDelta('PULSE', 80, 80)).toBeNull();
    expect(formatDelta('PULSE', undefined, 80)).toBeNull();
  });

  it('flags values outside the reference range', () => {
    expect(flagOf('SYSTOLIC', 150)).toBe('HIGH');
    expect(flagOf('SPO2', 90)).toBe('LOW');
    expect(flagOf('SPO2', 98)).toBeNull();
    expect(flagOf('HEIGHT', 180)).toBeNull();
  });

  it('counts completed items ignoring cancelled ones', () => {
    expect(
      itemsProgress([{ status: 'DONE' }, { status: 'PENDING' }, { status: 'CANCELLED' }]),
    ).toEqual({ done: 1, total: 2 });
  });
});
