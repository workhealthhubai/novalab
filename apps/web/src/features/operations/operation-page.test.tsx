import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PERMISSIONS } from '@osgb/shared-types';
import { operationsService } from '@/services/operations.service';
import { adminUser, signInAs } from '@/test/auth-fixtures';
import { OperationPage } from './operation-page';
vi.mock('@/services/operations.service', () => ({
  operationsService: { list: vi.fn(), summary: vi.fn(), options: vi.fn(), save: vi.fn() },
}));
function show() {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({
          defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
        })
      }
    >
      <MemoryRouter>
        <OperationPage kind="templates" />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}
beforeEach(() => {
  vi.resetAllMocks();
  signInAs();
  vi.mocked(operationsService.list).mockResolvedValue({
    items: [],
    meta: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
  });
  vi.mocked(operationsService.summary).mockResolvedValue({ states: [], balanceCents: null });
  vi.mocked(operationsService.options).mockResolvedValue([]);
});
describe('OperationPage', () => {
  it('submits a complete template and refreshes the list', async () => {
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Yeni kayıt' }));
    fireEvent.change(screen.getByLabelText('Başlık'), {
      target: { value: 'Yıllık değerlendirme' },
    });
    fireEvent.change(screen.getByLabelText('Rapor türü *'), { target: { value: 'İSG' } });
    fireEvent.change(screen.getByLabelText('Rapor içeriği *'), {
      target: { value: 'Yapılan çalışmalar ve öneriler' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Kaydet' }));
    await waitFor(() =>
      expect(operationsService.save).toHaveBeenCalledWith(
        'templates',
        expect.objectContaining({
          title: 'Yıllık değerlendirme',
          status: 'Aktif',
          fields: { category: 'İSG', content: 'Yapılan çalışmalar ve öneriler' },
        }),
        undefined,
      ),
    );
    await waitFor(() =>
      expect(screen.queryByRole('button', { name: 'Kaydet' })).not.toBeInTheDocument(),
    );
  });
  it('retains the form and displays an API failure', async () => {
    vi.mocked(operationsService.save).mockRejectedValue(new Error('Kayıt değişmiş.'));
    show();
    fireEvent.click(screen.getByRole('button', { name: 'Yeni kayıt' }));
    fireEvent.submit(screen.getByRole('button', { name: 'Kaydet' }).closest('form')!);
    expect(await screen.findByRole('alert')).toHaveTextContent('Kayıt değişmiş.');
    expect(screen.getByRole('button', { name: 'Kaydet' })).toBeInTheDocument();
  });
  it('does not offer creation without write permission', async () => {
    signInAs(adminUser, [PERMISSIONS.EXAMINATIONS_READ]);
    show();
    expect(screen.queryByRole('button', { name: 'Yeni kayıt' })).not.toBeInTheDocument();
    expect(await screen.findByText('Kayıt bulunamadı')).toBeInTheDocument();
  });
});
