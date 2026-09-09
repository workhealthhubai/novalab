import { endOfMonth, format, startOfMonth, subDays } from 'date-fns';
import { CalendarIcon, XIcon } from 'lucide-react';
import { useState } from 'react';
import type { DateRange } from 'react-day-picker';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { type DateRangeValue, formatDateRange, fromIsoDate } from '@/lib/date-range';
import { cn } from '@/lib/utils';

const ISO = 'yyyy-MM-dd';

interface DateRangePickerProps {
  id: string;
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
  placeholder?: string;
  max?: Date;
  min?: Date;
  disabled?: boolean;
  className?: string;
}

function toValue(range: DateRange | undefined): DateRangeValue {
  return {
    from: range?.from ? format(range.from, ISO) : '',
    to: range?.to ? format(range.to, ISO) : '',
  };
}

/** Quick picks shown beside the calendar; each returns an inclusive range ending today. */
function presets(today: Date): Array<{ label: string; range: DateRange }> {
  return [
    { label: 'Bugün', range: { from: today, to: today } },
    { label: 'Son 7 gün', range: { from: subDays(today, 6), to: today } },
    { label: 'Son 30 gün', range: { from: subDays(today, 29), to: today } },
    { label: 'Bu ay', range: { from: startOfMonth(today), to: endOfMonth(today) } },
  ];
}

/**
 * Date range filter (shadcn pattern: one trigger + two-month range calendar). Styled like the
 * other field controls; quick presets on the left, "Temizle" resets the filter.
 */
export type { DateRangeValue };

export function DateRangePicker({
  id,
  value,
  onChange,
  placeholder = 'Tarih aralığı',
  max,
  min,
  disabled,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false);
  const committed: DateRange | undefined =
    value.from || value.to
      ? { from: fromIsoDate(value.from), to: fromIsoDate(value.to) }
      : undefined;
  // While the popover is open the selection lives here; the parent (and its list query) only
  // hears about it once both ends are picked, or when the popover closes with a start date.
  const [draft, setDraft] = useState<DateRange | undefined>(committed);
  const label = formatDateRange(value);
  const today = new Date();

  const handleOpenChange = (next: boolean) => {
    if (next) setDraft(committed);
    else if (draft?.from && !draft.to) onChange(toValue({ from: draft.from, to: draft.from }));
    setOpen(next);
  };

  const commit = (range: DateRange | undefined) => {
    onChange(toValue(range));
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <div className={cn('relative', className)}>
        <PopoverTrigger asChild>
          <button
            type="button"
            id={id}
            aria-label={label ? `Tarih aralığı: ${label}` : placeholder}
            disabled={disabled}
            className={cn(
              'flex h-input w-full items-center gap-2 rounded-md border border-input bg-card pl-3 text-base transition-colors',
              'hover:border-slate-300 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-0 focus-visible:outline-none',
              'disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60',
              label ? 'pr-9 text-foreground' : 'pr-3 text-muted-foreground',
            )}
          >
            <CalendarIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="truncate tabular-nums">{label || placeholder}</span>
          </button>
        </PopoverTrigger>
        {label && !disabled ? (
          <button
            type="button"
            aria-label="Tarih aralığını temizle"
            onClick={() => onChange({ from: '', to: '' })}
            className="absolute inset-y-0 right-2 my-auto flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-offset-0"
          >
            <XIcon className="size-4" aria-hidden />
          </button>
        ) : null}
      </div>
      <PopoverContent className="w-auto p-0" align="end">
        <div className="flex">
          <div className="flex flex-col gap-0.5 border-r border-border p-2">
            {presets(today).map((preset) => (
              <button
                key={preset.label}
                type="button"
                className="rounded-md px-2.5 py-1.5 text-left text-sm text-foreground hover:bg-muted focus-visible:ring-offset-0"
                onClick={() => commit(preset.range)}
              >
                {preset.label}
              </button>
            ))}
            <button
              type="button"
              className="mt-1 rounded-md px-2.5 py-1.5 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-offset-0"
              onClick={() => {
                setDraft(undefined);
                commit(undefined);
              }}
            >
              Temizle
            </button>
          </div>
          <div className="p-2">
            <Calendar
              mode="range"
              numberOfMonths={2}
              showOutsideDays={false}
              captionLayout="label"
              selected={draft}
              defaultMonth={draft?.from ?? today}
              startMonth={min ?? new Date(2000, 0)}
              endMonth={max ?? new Date(today.getFullYear() + 1, 11)}
              disabled={[...(min ? [{ before: min }] : []), ...(max ? [{ after: max }] : [])]}
              // react-day-picker reports a single click as {from: day, to: day}, which would look
              // complete; picking is driven from day clicks instead: first click = start, second = end.
              onDayClick={(day) => {
                if (!draft?.from || draft.to) {
                  setDraft({ from: day, to: undefined });
                  return;
                }
                const [from, to] = day < draft.from ? [day, draft.from] : [draft.from, day];
                commit({ from, to });
              }}
            />
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
