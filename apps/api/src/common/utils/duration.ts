const UNIT_SECONDS: Record<string, number> = {
  s: 1,
  m: 60,
  h: 3600,
  d: 86400,
  w: 604800,
};

/**
 * Parses durations such as "15m", "7d", "3600" (seconds) or "1h30m" into seconds.
 * Throws on invalid input so misconfiguration is caught at startup.
 */
export function parseDurationToSeconds(input: string | number): number {
  if (typeof input === 'number') return input;
  const value = input.trim().toLowerCase();
  if (/^\d+$/.test(value)) return Number(value);

  const pattern = /(\d+(?:\.\d+)?)\s*([smhdw])/g;
  let total = 0;
  let matchedLength = 0;
  for (const match of value.matchAll(pattern)) {
    const amount = Number(match[1]);
    const unit = match[2] ?? 's';
    total += amount * (UNIT_SECONDS[unit] ?? 1);
    matchedLength += match[0].length;
  }
  if (matchedLength === 0 || matchedLength !== value.replace(/\s/g, '').length) {
    throw new Error(`Invalid duration: "${input}"`);
  }
  return Math.round(total);
}
