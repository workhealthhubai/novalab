import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { createMemoryRouter, RouterProvider } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PERMISSIONS } from '@osgb/shared-types';
import { TooltipProvider } from '@/components/ui/tooltip';
import { setSidebarCollapsed } from '@/lib/sidebar-state';
import { authService } from '@/services/auth.service';
import { useAuthStore } from '@/stores/auth.store';
import { adminUser, loginResponse, signInAs } from '@/test/auth-fixtures';
import { NAV_LEAVES } from './navigation';
import { routes } from './routes';

vi.mock('@/services/auth.service', () => ({
  authService: { login: vi.fn(), refresh: vi.fn(), logout: vi.fn(), me: vi.fn() },
}));
vi.mock('@/services/patients.service', () => ({
  patientsService: {
    list: vi.fn().mockResolvedValue({
      items: [
        {
          id: 'p1',
          firstName: 'Ayşe',
          lastName: 'Yılmaz',
          nationalId: '10000000146',
          registrationNumber: 'S-1',
          phone: '5321234567',
          birthDate: '1990-01-15',
          status: 'ACTIVE',
          identityVerificationStatus: 'VERIFIED',
          company: { id: 'c1', name: 'Örnek A.Ş.' },
        },
      ],
      meta: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    }),
  },
}));
vi.mock('@/services/tenants.service', () => ({
  tenantsService: {
    current: vi
      .fn()
      .mockResolvedValue({ id: 't-demo', name: 'Demo OSGB', slug: 'demo', status: 'ACTIVE' }),
  },
}));

function renderAt(path: string) {
  const router = createMemoryRouter(routes, { initialEntries: [path] });
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <RouterProvider router={router} />
      </TooltipProvider>
    </QueryClientProvider>,
  );
  return router;
}

describe('application skeleton', () => {
  beforeEach(() => {
    useAuthStore.getState().clearSession();
    vi.mocked(authService.login).mockReset();
    vi.mocked(authService.logout).mockResolvedValue(undefined);
  });

  it('redirects unauthenticated visitors to /login', async () => {
    const router = renderAt('/doctor/radiology');
    expect(await screen.findByRole('heading', { name: 'Giriş Yap' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/login');
  });

  it('logs in through the API and lands on the dashboard with the real principal', async () => {
    vi.mocked(authService.login).mockResolvedValue(loginResponse());
    const router = renderAt('/login');
    fireEvent.change(await screen.findByLabelText('E-posta'), {
      target: { value: 'admin@demo.local' },
    });
    fireEvent.change(screen.getByLabelText('Şifre'), { target: { value: 'Admin123!' } });
    fireEvent.click(screen.getByRole('button', { name: 'Giriş Yap' }));

    expect(await screen.findByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/dashboard');
    expect(authService.login).toHaveBeenCalledWith({
      email: 'admin@demo.local',
      password: 'Admin123!',
    });
    expect(useAuthStore.getState().accessToken).toBe('access-token');
    expect(screen.getAllByText('Demo Admin').length).toBeGreaterThan(0);
  });

  it('shows validation errors before calling the API', async () => {
    renderAt('/login');
    fireEvent.click(await screen.findByRole('button', { name: 'Giriş Yap' }));
    expect(await screen.findByText('Geçerli bir e-posta adresi girin')).toBeInTheDocument();
    expect(screen.getByText('Şifre zorunludur')).toBeInTheDocument();
    expect(authService.login).not.toHaveBeenCalled();
  });

  it('lists patients from the API with masked national ids', async () => {
    signInAs();
    renderAt('/patient-registration/patients');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Hasta Kayıt' }),
    ).toBeInTheDocument();
    expect(await screen.findByText('Ayşe Yılmaz')).toBeInTheDocument();
    expect(screen.getByText('100*****146')).toBeInTheDocument();
    expect(screen.getByText('532 123 45 67')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Yeni Hasta/ })).toHaveAttribute(
      'href',
      '/patient-registration/patients/new',
    );
  });

  it.each(
    NAV_LEAVES.filter((leaf) => leaf.path !== '/patient-registration/patients').map(
      (leaf) => [leaf.path, leaf.label] as const,
    ),
  )('renders %s with its page header and active nav item', async (path, label) => {
    signInAs();
    renderAt(path);
    expect(await screen.findByRole('heading', { level: 1, name: label })).toBeInTheDocument();
    expect(screen.getByText('Bu modül sonraki geliştirme fazında eklenecek.')).toBeInTheDocument();
    expect(screen.getAllByRole('link', { current: 'page' }).map((el) => el.textContent)).toEqual([
      label,
    ]);
  });

  it('hides entries without permission and renders the forbidden page for their routes', async () => {
    signInAs(adminUser, [PERMISSIONS.EMPLOYEES_READ]);
    renderAt('/settings/organization');
    expect(await screen.findByText('Bu sayfaya erişim yetkiniz yok')).toBeInTheDocument();
    const nav = screen.getByRole('navigation', { name: 'Ana navigasyon' });
    expect(nav).toHaveTextContent('Hasta Kayıt');
    expect(nav).not.toHaveTextContent('Genel Ayarlar');
    expect(nav).not.toHaveTextContent('Doktor Modülü');
  });

  it('collapses the sidebar to an icon rail and back', async () => {
    signInAs();
    renderAt('/doctor/ecg');
    await screen.findByRole('heading', { level: 1, name: 'EKG' });
    fireEvent.click(screen.getByRole('button', { name: 'Menüyü daralt' }));
    expect(screen.queryByRole('link', { name: 'EKG' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Doktor Modülü' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Menüyü genişlet' }));
    expect(await screen.findByRole('link', { name: 'EKG' })).toBeInTheDocument();
    setSidebarCollapsed(false);
  });

  it('detail routes exist and show the record id', async () => {
    signInAs();
    renderAt('/patient-registration/protocols/abc-123');
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Protokol Listesi · Detay' }),
    ).toBeInTheDocument();
    expect(screen.getByText('Kayıt kimliği: abc-123')).toBeInTheDocument();
  });

  it('unknown routes render the not-found page', async () => {
    renderAt('/does-not-exist');
    expect(await screen.findByText('Sayfa bulunamadı')).toBeInTheDocument();
  });
});
