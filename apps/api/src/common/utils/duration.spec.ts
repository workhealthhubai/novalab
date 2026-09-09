import { parseDurationToSeconds } from './duration';

describe('parseDurationToSeconds', () => {
  it.each([
    ['15m', 900],
    ['7d', 604800],
    ['1h30m', 5400],
    ['3600', 3600],
    [45, 45],
  ])('parses %p', (input, expected) => {
    expect(parseDurationToSeconds(input)).toBe(expected);
  });

  it('rejects garbage', () => {
    expect(() => parseDurationToSeconds('soon')).toThrow(/Invalid duration/);
  });
});
