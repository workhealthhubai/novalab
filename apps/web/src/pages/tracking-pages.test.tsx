import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PERMISSIONS } from '@osgb/shared-types';
import { TooltipProvider } from '@/components/ui/tooltip';
import { signInAs, adminUser } from '@/test/auth-fixtures';
import { DocumentTrackingPage } from './document-tracking-page';
import { WorkItemsPage } from './work-items-page';
import { documentsService } from '@/services/documents.service';
import { workItemsService } from '@/services/work-items.service';

const meta = { page: 1, pageSize: 20, total: 1, totalPages: 1 };
vi.mock('@/services/documents.service', () => ({
  documentsService: { list: vi.fn(), upload: vi.fn(), updateExpiry: vi.fn(), downloadUrl: vi.fn() },
}));
vi.mock('@/services/companies.service', () => ({
  companiesService: { list: vi.fn().mockResolvedValue({ items: [], meta: { total: 0 } }) },
}));
vi.mock('@/services/work-items.service', () => ({ workItemsService: { list: vi.fn() } }));
function show(page: React.ReactNode) {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <TooltipProvider>
        <MemoryRouter>{page}</MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  signInAs();
});
describe('tracking pages', () => {
  it('filters documents and saves an explicitly cleared expiry date', async () => {
    vi.mocked(documentsService.list).mockResolvedValue({
      items: [
        {
          id: 'd1',
          fileName: 'Sözleşme.pdf',
          expiresAt: '2026-10-01',
          category: 'OTHER',
          isMedical: false,
          companyId: null,
        },
      ],
      meta,
    });
    show(<DocumentTrackingPage />);
    expect(await screen.findByText('Sözleşme.pdf')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Süre filtresi'), { target: { value: 'overdue' } });
    await waitFor(() =>
      expect(documentsService.list).toHaveBeenLastCalledWith(
        expect.objectContaining({ expiry: 'overdue', page: 1 }),
      ),
    );
    fireEvent.click(await screen.findByRole('button', { name: 'Tarihi düzenle' }));
    fireEvent.change(screen.getByLabelText('Yeni bitiş tarihi (boş bırakırsanız kaldırılır)'), {
      target: { value: '' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Tarihi kaydet' }));
    await waitFor(() => expect(documentsService.updateExpiry).toHaveBeenCalledWith('d1', null));
  });
  it('does not request clinical or protocol lists for employee-only users', async () => {
    signInAs({ ...adminUser, permissions: [PERMISSIONS.EMPLOYEES_READ] });
    vi.mocked(workItemsService.list).mockResolvedValue({
      items: [
        {
          id: 'e1',
          title: 'Test Çalışan',
          description: 'Çalışan bilgileri',
          reasons: ['Firma atanmamış'],
          date: '2026-09-13',
          target: 'patient',
          targetId: 'e1',
        },
      ],
      meta,
    });
    show(<WorkItemsPage />);
    expect(await screen.findByText('Firma atanmamış')).toBeInTheDocument();
    expect(workItemsService.list).toHaveBeenCalledTimes(1);
    expect(workItemsService.list).toHaveBeenCalledWith('missing', 1);
    expect(screen.getByRole('link', { name: 'Kaydı aç' })).toHaveAttribute(
      'href',
      '/patient-registration/patients/e1',
    );
    expect(screen.queryByText(/Onaylanmamış raporlar/)).not.toBeInTheDocument();
  });
});
