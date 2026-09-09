import { AUDIOMETRY_FREQUENCIES } from '@osgb/shared-types';
import { Input } from '@/components/ui/input';
import { draftError, type ThresholdDraft } from './threshold-draft';
import { cn } from '@/lib/utils';

interface Row {
  key: string;
  label: string;
  tone: 'right' | 'left';
  draft: ThresholdDraft;
  onChange: (draft: ThresholdDraft) => void;
}

interface ThresholdGridProps {
  rows: Row[];
  disabled?: boolean;
}

/** Frequencies across, ears down; arrow keys move between cells like a spreadsheet. */
export function ThresholdGrid({ rows, disabled = false }: ThresholdGridProps) {
  const move = (
    event: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number,
    colIndex: number,
  ) => {
    const delta: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
      Enter: [0, 1],
    };
    const step = delta[event.key];
    if (!step) return;
    const input = event.currentTarget;
    if (
      (event.key === 'ArrowLeft' && input.selectionStart !== 0) ||
      (event.key === 'ArrowRight' && input.selectionStart !== input.value.length)
    )
      return;
    const next = document.querySelector<HTMLInputElement>(
      `[data-cell="${rowIndex + step[0]}-${colIndex + step[1]}"]`,
    );
    if (next) {
      event.preventDefault();
      next.focus();
      next.select();
    }
  };
  return (
    <div className="scrollbar-subtle overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="p-2 text-left text-xs font-semibold text-muted-foreground">dB HL</th>
            {AUDIOMETRY_FREQUENCIES.map((f) => (
              <th
                key={f}
                className={cn(
                  'p-2 text-center text-xs font-semibold text-muted-foreground',
                  (f === 3000 || f === 6000) && 'text-muted-foreground/70',
                )}
              >
                {f >= 1000 ? `${f / 1000} kHz` : `${f} Hz`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr key={row.key} className="border-t border-border">
              <th
                scope="row"
                className={cn(
                  'p-2 text-left font-medium whitespace-nowrap',
                  row.tone === 'right' ? 'text-[#dc2626]' : 'text-[#2563eb]',
                )}
              >
                {row.label}
              </th>
              {AUDIOMETRY_FREQUENCIES.map((f, ci) => {
                const value = row.draft[`${f}`];
                const error = draftError(value);
                return (
                  <td key={f} className="p-1">
                    <Input
                      data-cell={`${ri}-${ci}`}
                      aria-label={`${row.label} ${f} Hz`}
                      inputMode="numeric"
                      className={cn(
                        'h-9 w-full min-w-14 text-center tabular-nums',
                        error && 'border-destructive',
                      )}
                      value={value}
                      disabled={disabled}
                      title={error ?? undefined}
                      onChange={(e) => row.onChange({ ...row.draft, [`${f}`]: e.target.value })}
                      onKeyDown={(e) => move(e, ri, ci)}
                      onFocus={(e) => e.currentTarget.select()}
                    />
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
