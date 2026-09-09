import { format, isValid, parse } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { useState } from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

const ISO = 'yyyy-MM-dd';
const DISPLAY = 'dd.MM.yyyy';

interface DatePickerProps {
  id: string;
  /** ISO date (yyyy-MM-dd) or '' when empty; anything else is passed through as the user typed it. */
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  min?: Date;
  max?: Date;
  disabled?: boolean;
  invalid?: boolean;
  placeholder?: string;
  className?: string;
}

function toIso(date: Date): string {
  return format(date, ISO);
}

function fromIso(value: string): Date | null {
  const date = parse(value, ISO, new Date());
  return isValid(date) ? date : null;
}

/** "01021990" / "1.2.1990" → "01.02.1990" while typing. */
function maskDisplay(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  const parts = [digits.slice(0, 2), digits.slice(2, 4), digits.slice(4, 8)].filter(Boolean);
  return parts.join('.');
}

function parseDisplay(text: string): Date | null {
  if (!/^\d{2}\.\d{2}\.\d{4}$/.test(text)) return null;
  const date = parse(text, DISPLAY, new Date());
  return isValid(date) ? date : null;
}

/**
 * Date field for forms: typed as dd.MM.yyyy (auto-masked) or picked from the calendar popover.
 * The form value stays an ISO date string, so validation and the API payload are unchanged.
 */
export function DatePicker({
  id,
  value,
  onChange,
  onBlur,
  min,
  max,
  disabled,
  invalid,
  placeholder = 'gg.aa.yyyy',
  className,
}: DatePickerProps) {
  const selected = fromIso(value);
  const [open, setOpen] = useState(false);
  // Text mirrors the value; while typing it may be incomplete until blur.
  const [text, setText] = useState(selected ? format(selected, DISPLAY) : value);
  const [lastValue, setLastValue] = useState(value);
  if (value !== lastValue) {
    setLastValue(value);
    setText(selected ? format(selected, DISPLAY) : value);
  }

  const commit = (raw: string) => {
    const masked = maskDisplay(raw);
    setText(masked);
    const date = parseDisplay(masked);
    if (date) onChange(toIso(date));
    else if (masked === '') onChange('');
    else if (masked.length === DISPLAY.length) onChange(masked); // complete but invalid → validation error
  };

  return (
    <div className={cn('relative', className)}>
      <Input
        id={id}
        inputMode="numeric"
        autoComplete="off"
        placeholder={placeholder}
        value={text}
        disabled={disabled}
        aria-invalid={invalid ? true : undefined}
        className="pr-10"
        onChange={(event) => commit(event.target.value)}
        onBlur={() => {
          if (text !== '' && !parseDisplay(text)) onChange(text);
          onBlur?.();
        }}
      />
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label="Takvimden seç"
            disabled={disabled}
            className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CalendarIcon className="size-4" aria-hidden />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="end">
          <Calendar
            mode="single"
            selected={selected ?? undefined}
            defaultMonth={selected ?? max ?? new Date()}
            startMonth={min ?? new Date(1900, 0)}
            endMonth={max ?? new Date(new Date().getFullYear() + 10, 11)}
            disabled={[...(min ? [{ before: min }] : []), ...(max ? [{ after: max }] : [])]}
            onSelect={(date) => {
              if (date) {
                onChange(toIso(date));
                setOpen(false);
              }
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}
