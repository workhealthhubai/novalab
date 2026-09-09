import { findNavLeaf, findNavSection } from '@/app/router/navigation';
import { EmptyState } from '@/design-system/empty-state';
import { PageHeader, type Breadcrumb } from '@/design-system/page-header';

interface ModulePlaceholderProps {
  /** Module list path (from PATHS); title/description come from the navigation config. */
  path: string;
  /** Present on `/module/:id` routes — shown in the breadcrumb, nothing else. */
  detailId?: string;
}

/**
 * Phase 1 page body: a PageHeader plus an empty bordered section.
 * Deliberately contains no data, tables or forms.
 */
export function ModulePlaceholder({ path, detailId }: ModulePlaceholderProps) {
  const leaf = findNavLeaf(path);
  const section = findNavSection(path);
  const title = leaf?.label ?? 'Modül';
  const breadcrumbs: Breadcrumb[] = [
    ...(section ? [{ label: section.label }] : []),
    ...(detailId
      ? [{ label: title, to: path }, { label: `Kayıt ${detailId}` }]
      : [{ label: title }]),
  ];

  return (
    <>
      <PageHeader
        title={detailId ? `${title} · Detay` : title}
        description={leaf?.description}
        breadcrumbs={breadcrumbs.length > 1 ? breadcrumbs : undefined}
      />
      <EmptyState
        title="Bu modül sonraki geliştirme fazında eklenecek."
        description={detailId ? `Kayıt kimliği: ${detailId}` : undefined}
      />
    </>
  );
}
