import { ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { Fragment } from 'react';
import { Link } from 'react-router';
import { cn } from '@/lib/utils';

export interface Breadcrumb {
  label: string;
  /** Omit for the current (last) item. */
  to?: string;
}

interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: ReactNode;
  className?: string;
}

/** Title block at the top of every page. Keep actions minimal (one or two buttons). */
export function PageHeader({
  title,
  description,
  breadcrumbs,
  actions,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn('flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between', className)}
    >
      <div className="min-w-0">
        {breadcrumbs && breadcrumbs.length > 0 ? (
          <nav
            aria-label="Breadcrumb"
            className="mb-1.5 flex flex-wrap items-center gap-1 text-sm text-muted-foreground"
          >
            {breadcrumbs.map((crumb, index) => (
              <Fragment key={`${crumb.label}-${index}`}>
                {index > 0 ? <ChevronRight className="size-3.5" aria-hidden /> : null}
                {crumb.to ? (
                  <Link
                    to={crumb.to}
                    className="rounded-xs transition-colors hover:text-foreground"
                  >
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-foreground" aria-current="page">
                    {crumb.label}
                  </span>
                )}
              </Fragment>
            ))}
          </nav>
        ) : null}
        <h1 className="text-xl font-bold tracking-[-0.01em] text-foreground">{title}</h1>
        {description ? <p className="mt-1 text-base text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </div>
  );
}
