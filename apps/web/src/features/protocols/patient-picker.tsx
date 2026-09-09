import { CheckIcon, ChevronDownIcon, UserRound } from 'lucide-react';
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
import { usePatients } from '@/features/patients/use-patients';
import { maskNationalId } from '@/features/patients/patient-utils';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { cn } from '@/lib/utils';
import type { PatientListItem } from '@/types/patient';

interface PatientPickerProps {
  id: string;
  value: PatientListItem | null;
  onChange: (patient: PatientListItem | null) => void;
  invalid?: boolean;
  disabled?: boolean;
}

/** Server-searched patient select (name, TC no, registration no or phone); results come from the API. */
export function PatientPicker({ id, value, onChange, invalid, disabled }: PatientPickerProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const debounced = useDebouncedValue(search.trim(), 300);
  const patients = usePatients({ pageSize: 20, ...(debounced ? { search: debounced } : {}) }, open);
  const items = patients.data?.items ?? [];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-invalid={invalid ? true : undefined}
          disabled={disabled}
          className={cn(
            'flex h-input w-full items-center gap-2 rounded-md border border-input bg-card pr-9 pl-3 text-base transition-colors',
            'hover:border-slate-300 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-0 focus-visible:outline-none',
            'disabled:cursor-not-allowed disabled:bg-muted disabled:opacity-60 aria-invalid:border-destructive',
            value ? 'text-foreground' : 'text-muted-foreground',
          )}
        >
          <UserRound className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="truncate">
            {value ? `${value.firstName} ${value.lastName}` : 'Hasta seçin'}
          </span>
          {value?.nationalId ? (
            <span className="ml-auto font-mono text-xs text-muted-foreground">
              {maskNationalId(value.nationalId)}
            </span>
          ) : null}
          <ChevronDownIcon
            className="pointer-events-none absolute right-3 size-4 text-muted-foreground"
            aria-hidden
          />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Ad, TC Kimlik No, sicil no veya telefon…"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList>
            <CommandEmpty>{patients.isPending ? 'Aranıyor…' : 'Hasta bulunamadı'}</CommandEmpty>
            <CommandGroup>
              {items.map((patient) => (
                <CommandItem
                  key={patient.id}
                  value={patient.id}
                  onSelect={() => {
                    onChange(patient);
                    setOpen(false);
                  }}
                >
                  <CheckIcon
                    className={cn(
                      'size-4 shrink-0',
                      patient.id === value?.id ? 'opacity-100' : 'opacity-0',
                    )}
                    aria-hidden
                  />
                  <span className="truncate">
                    {patient.firstName} {patient.lastName}
                  </span>
                  <span className="ml-auto font-mono text-xs text-muted-foreground">
                    {maskNationalId(patient.nationalId)}
                  </span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
