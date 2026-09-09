import type { RadiologyModality, RadiologyRequestStatus } from '@osgb/shared-types';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DateRangePicker, type DateRangeValue } from '@/design-system/date-range-picker';
import { FilterChip } from '@/design-system/filter-chip';
import { MODALITIES, RADIOLOGY_STATUS, RADIOLOGY_STATUSES } from './radiology-labels';

export interface RadiologyFilterValues {
  search: string;
  status: RadiologyRequestStatus | null;
  modality: RadiologyModality | null;
  range: DateRangeValue;
}

interface RadiologyFiltersProps {
  value: RadiologyFilterValues;
  onChange: (value: RadiologyFilterValues) => void;
}

/** Search + date range, then status and modality chips (side-scrolling on phones). */
export function RadiologyFilters({ value, onChange }: RadiologyFiltersProps) {
  const set = (patch: Partial<RadiologyFilterValues>) => onChange({ ...value, ...patch });
  return (
    <div className="flex flex-col gap-3 border-b border-border p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative min-w-0 flex-1 sm:max-w-sm">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            aria-label="Radyoloji isteği ara"
            placeholder="Hasta adı, TC Kimlik No veya bölge"
            className="pl-9"
            value={value.search}
            onChange={(e) => set({ search: e.target.value })}
          />
        </div>
        <DateRangePicker
          id="radiology-range"
          value={value.range}
          onChange={(range) => set({ range })}
          placeholder="İstek tarihi aralığı"
          max={new Date()}
          className="w-full sm:ml-auto sm:w-72"
        />
      </div>
      <div
        role="group"
        aria-label="Durum ve modalite filtresi"
        className="scrollbar-none -mx-3 flex gap-1.5 overflow-x-auto px-3 sm:mx-0 sm:flex-wrap sm:px-0"
      >
        <FilterChip
          label="Tümü"
          active={value.status === null}
          onClick={() => set({ status: null })}
        />
        {RADIOLOGY_STATUSES.map((s) => (
          <FilterChip
            key={s}
            label={RADIOLOGY_STATUS[s].label}
            active={value.status === s}
            onClick={() => set({ status: value.status === s ? null : s })}
          />
        ))}
        <span className="mx-1 self-center text-border">|</span>
        {MODALITIES.map((m) => (
          <FilterChip
            key={m}
            label={m}
            active={value.modality === m}
            onClick={() => set({ modality: value.modality === m ? null : m })}
          />
        ))}
      </div>
    </div>
  );
}
