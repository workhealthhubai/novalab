import { tr } from 'date-fns/locale/tr';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { type ComponentProps } from 'react';
import { DayPicker, getDefaultClassNames } from 'react-day-picker';
import { cn } from '@/lib/utils';

/**
 * shadcn-style calendar on react-day-picker (no default stylesheet; every part is styled with the
 * design tokens used by Input/Select). Turkish locale; month/year dropdowns on by default because
 * the main use is birth dates, where paging month by month is impractical.
 */
function Calendar({ className, classNames, ...props }: ComponentProps<typeof DayPicker>) {
  const defaults = getDefaultClassNames();
  return (
    <DayPicker
      locale={tr}
      captionLayout="dropdown"
      showOutsideDays
      className={cn('w-fit p-1 text-foreground select-none', className)}
      classNames={{
        root: cn(defaults.root, 'relative'),
        months: 'relative flex flex-col gap-4',
        month: 'flex flex-col gap-3',
        month_caption: 'flex h-8 items-center justify-center pr-16 pl-1',
        // Preflight makes <svg> block-level, so the label must be a flex row for its chevron.
        caption_label: 'inline-flex items-center gap-1 text-sm font-semibold',
        dropdowns: 'flex items-center gap-1.5',
        dropdown_root:
          'relative inline-flex h-8 items-center gap-1 rounded-md border border-input bg-card pr-1.5 pl-2.5 text-sm font-medium transition-colors hover:border-slate-300 has-focus-visible:border-primary has-focus-visible:ring-2 has-focus-visible:ring-ring/40',
        dropdown:
          'absolute inset-0 w-full cursor-pointer opacity-0 focus-visible:ring-0 focus-visible:ring-offset-0',
        nav: 'absolute top-0 right-0 flex items-center gap-1',
        button_previous:
          'inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-40',
        button_next:
          'inline-flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-offset-0 disabled:pointer-events-none disabled:opacity-40',
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday:
          'w-9 text-center text-[11px] font-medium tracking-wide text-muted-foreground uppercase',
        week: 'mt-1 flex',
        day: 'relative size-9 p-0 text-center text-sm',
        day_button:
          'size-9 rounded-md font-normal transition-colors hover:bg-muted focus-visible:ring-offset-0 aria-selected:hover:bg-primary-dark',
        selected: '[&>button]:bg-primary [&>button]:font-medium [&>button]:text-primary-foreground',
        today: '[&>button]:bg-primary-soft [&>button]:font-semibold [&>button]:text-primary-dark',
        outside: 'text-muted-foreground/50',
        disabled: 'text-muted-foreground/40 [&>button]:pointer-events-none',
        hidden: 'invisible',
        chevron: 'size-4',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClass, ...rest }) => {
          const Icon =
            orientation === 'left'
              ? ChevronLeft
              : orientation === 'right'
                ? ChevronRight
                : ChevronDown;
          return <Icon className={cn('size-4', chevronClass)} {...rest} />;
        },
      }}
      {...props}
    />
  );
}

export { Calendar };
