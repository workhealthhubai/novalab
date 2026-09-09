import {
  AUDIOMETRY_FREQUENCIES,
  type AudiometryFrequency,
  type Thresholds,
  thresholdAt,
} from '@osgb/shared-types';

interface AudiogramChartProps {
  airRight: Thresholds;
  airLeft: Thresholds;
  boneRight?: Thresholds | null;
  boneLeft?: Thresholds | null;
  className?: string;
}

const W = 560;
const H = 340;
const PAD = { top: 24, right: 20, bottom: 36, left: 44 };
const DB_MIN = -10;
const DB_MAX = 120;
const RIGHT = '#dc2626';
const LEFT = '#2563eb';

/** Octave-scaled x axis (3 and 6 kHz sit at half octaves, as on paper audiograms). */
function x(frequency: number): number {
  const lo = Math.log2(250);
  const hi = Math.log2(8000);
  return PAD.left + ((Math.log2(frequency) - lo) / (hi - lo)) * (W - PAD.left - PAD.right);
}
function y(db: number): number {
  return PAD.top + ((db - DB_MIN) / (DB_MAX - DB_MIN)) * (H - PAD.top - PAD.bottom);
}

type Point = { f: AudiometryFrequency; v: number };

function points(t: Thresholds): Point[] {
  return AUDIOMETRY_FREQUENCIES.map((f) => ({ f, v: thresholdAt(t, f) })).filter(
    (p): p is Point => p.v !== null,
  );
}

/** Standard clinical audiogram: right ear O/red, left X/blue, bone conduction < > without lines. */
export function AudiogramChart({
  airRight,
  airLeft,
  boneRight = null,
  boneLeft = null,
  className,
}: AudiogramChartProps) {
  const right = points(airRight);
  const left = points(airLeft);
  const bRight = boneRight ? points(boneRight) : [];
  const bLeft = boneLeft ? points(boneLeft) : [];
  const line = (pts: Point[]) => pts.map((p) => `${x(p.f)},${y(p.v)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Odyogram" className={className}>
      <rect
        x={PAD.left}
        y={y(DB_MIN)}
        width={W - PAD.left - PAD.right}
        height={y(25) - y(DB_MIN)}
        className="fill-success/10"
      />
      {Array.from({ length: (DB_MAX - DB_MIN) / 10 + 1 }, (_, i) => DB_MIN + i * 10).map((db) => (
        <g key={db}>
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={y(db)}
            y2={y(db)}
            className={db % 20 === 0 ? 'stroke-border' : 'stroke-border/50'}
            strokeWidth={1}
          />
          {db % 20 === 0 ? (
            <text
              x={PAD.left - 8}
              y={y(db) + 4}
              textAnchor="end"
              className="fill-muted-foreground"
              fontSize={10}
            >
              {db}
            </text>
          ) : null}
        </g>
      ))}
      {AUDIOMETRY_FREQUENCIES.map((f) => (
        <g key={f}>
          <line
            x1={x(f)}
            x2={x(f)}
            y1={y(DB_MIN)}
            y2={y(DB_MAX)}
            className="stroke-border"
            strokeWidth={1}
            strokeDasharray={f === 3000 || f === 6000 ? '3 3' : undefined}
          />
          <text
            x={x(f)}
            y={H - PAD.bottom + 16}
            textAnchor="middle"
            className="fill-muted-foreground"
            fontSize={10}
          >
            {f >= 1000 ? `${f / 1000}k` : f}
          </text>
        </g>
      ))}
      <text x={W / 2} y={H - 4} textAnchor="middle" className="fill-muted-foreground" fontSize={10}>
        Frekans (Hz)
      </text>
      <text
        x={12}
        y={H / 2}
        textAnchor="middle"
        transform={`rotate(-90 12 ${H / 2})`}
        className="fill-muted-foreground"
        fontSize={10}
      >
        İşitme eşiği (dB HL)
      </text>

      {right.length > 1 ? (
        <polyline points={line(right)} fill="none" stroke={RIGHT} strokeWidth={1.5} />
      ) : null}
      {left.length > 1 ? (
        <polyline
          points={line(left)}
          fill="none"
          stroke={LEFT}
          strokeWidth={1.5}
          strokeDasharray="5 3"
        />
      ) : null}
      {right.map((p) => (
        <circle
          key={`r${p.f}`}
          cx={x(p.f)}
          cy={y(p.v)}
          r={5}
          fill="white"
          stroke={RIGHT}
          strokeWidth={2}
        />
      ))}
      {left.map((p) => (
        <g key={`l${p.f}`} stroke={LEFT} strokeWidth={2}>
          <line x1={x(p.f) - 5} x2={x(p.f) + 5} y1={y(p.v) - 5} y2={y(p.v) + 5} />
          <line x1={x(p.f) - 5} x2={x(p.f) + 5} y1={y(p.v) + 5} y2={y(p.v) - 5} />
        </g>
      ))}
      {bRight.map((p) => (
        <text
          key={`br${p.f}`}
          x={x(p.f) - 9}
          y={y(p.v) + 5}
          fill={RIGHT}
          fontSize={14}
          fontWeight={700}
        >
          {'<'}
        </text>
      ))}
      {bLeft.map((p) => (
        <text
          key={`bl${p.f}`}
          x={x(p.f) + 3}
          y={y(p.v) + 5}
          fill={LEFT}
          fontSize={14}
          fontWeight={700}
        >
          {'>'}
        </text>
      ))}
      <g fontSize={10} className="fill-foreground">
        <circle
          cx={W - PAD.right - 150}
          cy={PAD.top - 10}
          r={4}
          fill="white"
          stroke={RIGHT}
          strokeWidth={2}
        />
        <text x={W - PAD.right - 142} y={PAD.top - 6}>
          Sağ hava
        </text>
        <g stroke={LEFT} strokeWidth={2}>
          <line
            x1={W - PAD.right - 84}
            x2={W - PAD.right - 76}
            y1={PAD.top - 14}
            y2={PAD.top - 6}
          />
          <line
            x1={W - PAD.right - 84}
            x2={W - PAD.right - 76}
            y1={PAD.top - 6}
            y2={PAD.top - 14}
          />
        </g>
        <text x={W - PAD.right - 70} y={PAD.top - 6}>
          Sol hava
        </text>
        <text x={W - PAD.right - 14} y={PAD.top - 6} fill={RIGHT} fontWeight={700}>
          {'<'}
        </text>
        <text x={W - PAD.right - 4} y={PAD.top - 6} fill={LEFT} fontWeight={700}>
          {'>'}
        </text>
      </g>
    </svg>
  );
}
