import { measurementDefinition } from '@osgb/shared-types';

interface SparklineProps {
  measurementKey: string;
  /** One entry per compared column; undefined = not measured. */
  values: Array<number | undefined>;
}

const W = 96;
const H = 28;
const PAD = 3;

/** Tiny trend line across the compared columns; the reference band is shaded when the catalogue has one. */
export function Sparkline({ measurementKey, values }: SparklineProps) {
  const points = values
    .map((v, i) => (v === undefined ? null : { i, v }))
    .filter((p): p is { i: number; v: number } => p !== null);
  if (points.length < 2) return null;
  const normal = measurementDefinition(measurementKey)?.normal;
  const all = points
    .map((p) => p.v)
    .concat(
      normal?.min !== undefined ? [normal.min] : [],
      normal?.max !== undefined ? [normal.max] : [],
    );
  const min = Math.min(...all);
  const max = Math.max(...all);
  const span = max - min || 1;
  const x = (i: number) => PAD + (i / Math.max(values.length - 1, 1)) * (W - 2 * PAD);
  const y = (v: number) => H - PAD - ((v - min) / span) * (H - 2 * PAD);
  const bandTop = normal?.max !== undefined ? y(normal.max) : PAD;
  const bandBottom = normal?.min !== undefined ? y(normal.min) : H - PAD;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} aria-hidden className="shrink-0">
      {normal ? (
        <rect
          x={PAD}
          y={Math.min(bandTop, bandBottom)}
          width={W - 2 * PAD}
          height={Math.abs(bandBottom - bandTop)}
          className="fill-success/10"
        />
      ) : null}
      <polyline
        points={points.map((p) => `${x(p.i)},${y(p.v)}`).join(' ')}
        fill="none"
        className="stroke-primary"
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {points.map((p) => (
        <circle key={p.i} cx={x(p.i)} cy={y(p.v)} r={2} className="fill-primary" />
      ))}
    </svg>
  );
}
