import type { PaginationMeta } from '@osgb/shared-types';
import { AppButton } from './app-button';

interface PaginationProps {
  meta: PaginationMeta;
  onPageChange: (page: number) => void;
}

export function Pagination({ meta, onPageChange }: PaginationProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-3 py-2.5 text-sm text-muted-foreground">
      <span>
        Toplam {meta.total} kayıt · Sayfa {meta.page} / {meta.totalPages}
      </span>
      <div className="flex gap-2">
        <AppButton
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(meta.page - 1)}
          disabled={meta.page <= 1}
        >
          Önceki
        </AppButton>
        <AppButton
          variant="secondary"
          size="sm"
          onClick={() => onPageChange(meta.page + 1)}
          disabled={meta.page >= meta.totalPages}
        >
          Sonraki
        </AppButton>
      </div>
    </div>
  );
}
