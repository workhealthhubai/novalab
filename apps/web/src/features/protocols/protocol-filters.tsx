import type { ProtocolStatus } from '@osgb/shared-types';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DateRangePicker, type DateRangeValue } from '@/design-system/date-range-picker';
import { FilterChip } from '@/design-system/filter-chip';
import { PROTOCOL_STATUS } from './protocol-labels';

const STATUS_FILTERS = Object.keys(PROTOCOL_STATUS) as ProtocolStatus[];

export interface ProtocolFilterValues {
  search: string;
  status: ProtocolStatus | null;
  range: DateRangeValue;
}

interface ProtocolFiltersProps {
  value: ProtocolFilterValues;
  onChange: (value: ProtocolFilterValues) => void;
}

/**
 * Filter bar of the protocol list. Two rows: search + date range (stacked under `sm`), then the
 * status chips, which scroll sideways on phones instead of wrapping into a tall block.
 */
export function ProtocolFilters({ value, onChange }: ProtocolFiltersProps) {
  const set = (patch: Partial<ProtocolFilterValues>) => onChange({ ...value, ...patch });
  return (
    <div className="flex flex-col gap-3 border-b border-border p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            aria-label="Protokol ara"
            placeholder="Protokol no, ad, TC Kimlik No veya sicil no"
            className="pl-9"
            value={value.search}
            onChange={(event) => set({ search: event.target.value })}
          />
        </div>
        <DateRangePicker
          id="protocol-range"
          value={value.range}
          onChange={(range) => set({ range })}
          placeholder="Açılış tarihi aralığı"
          max={new Date()}
          className="w-full sm:ml-auto sm:w-72"
        />
      </div>
      <div
        role="group"
        aria-label="Durum filtresi"
        className="scrollbar-none -mx-3 flex gap-1.5 overflow-x-auto px-3 sm:mx-0 sm:flex-wrap sm:px-0"
      >
        <FilterChip
          label="Tümü"
          active={value.status === null}
          onClick={() => set({ status: null })}
        />
        {STATUS_FILTERS.map((status) => (
          <FilterChip
            key={status}
            label={PROTOCOL_STATUS[status].label}
            active={value.status === status}
            onClick={() => set({ status: value.status === status ? null : status })}
          />
        ))}
      </div>
    </div>
  );
}
