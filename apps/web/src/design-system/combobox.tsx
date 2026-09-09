import { CheckIcon, ChevronDownIcon, XIcon } from 'lucide-react';
import { useState } from 'react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { rankOption } from '@/lib/search';
import { cn } from '@/lib/utils';

export interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  id: string;
  value: string | null;
  onChange: (value: string | null) => void;
  options: ComboboxOption[];
  placeholder: string;
  searchPlaceholder?: string;
  emptyText?: string;
  loading?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  /** Show an "×" that clears the selection. */
  clearable?: boolean;
  className?: string;
}

/** Searchable single select (Popover + cmdk), used where option lists are long (provinces, districts…). */
export function Combobox({
  id,
  value,
  onChange,
  options,
  placeholder,
  searchPlaceholder = 'Ara…',
  emptyText = 'Sonuç bulunamadı',
  loading,
  disabled,
  invalid,
  clearable = true,
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value) ?? null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <div className={cn('relative', className)}>
        <PopoverTrigger asChild>
          <button
            type="button"
            id={id}
            role="combobox"
            aria-expanded={open}
            aria-invalid={invalid ? true : undefined}
            disabled={disabled || loading}
            className={cn(
              'flex h-input w-full items-center rounded-md border border-input bg-card pl-3 text-base transition-colors',
              'hover:border-slate-300 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-0 focus-visible:outline-none',
              'disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60',
              'aria-invalid:border-destructive',
              selected ? 'text-foreground' : 'text-muted-foreground',
              clearable && selected ? 'pr-16' : 'pr-9',
            )}
          >
            <span className="truncate">
              {loading ? 'Yükleniyor…' : (selected?.label ?? placeholder)}
            </span>
            <ChevronDownIcon
              className="pointer-events-none absolute inset-y-0 right-3 my-auto size-4 text-muted-foreground"
              aria-hidden
            />
          </button>
        </PopoverTrigger>
        {clearable && selected && !disabled ? (
          <button
            type="button"
            aria-label="Seçimi temizle"
            onClick={() => onChange(null)}
            className="absolute inset-y-0 right-9 my-auto flex size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:ring-offset-0"
          >
            <XIcon className="size-4" aria-hidden />
          </button>
        ) : null}
      </div>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command
          defaultValue={value ?? undefined}
          filter={(_value, search, keywords) => rankOption(keywords?.join(' ') ?? '', search)}
        >
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.value}
                  keywords={[option.label]}
                  onSelect={() => {
                    onChange(option.value);
                    setOpen(false);
                  }}
                >
                  <CheckIcon
                    className={cn(
                      'size-4 shrink-0',
                      option.value === value ? 'opacity-100' : 'opacity-0',
                    )}
                    aria-hidden
                  />
                  <span className="truncate">{option.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
