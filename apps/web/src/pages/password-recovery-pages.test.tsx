import { StrictMode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authService } from '@/services/auth.service';
import { ForgotPasswordPage, ResetPasswordPage } from './password-recovery-pages';

vi.mock('@/services/auth.service', () => ({
  authService: { passwordHelp: vi.fn(), resetPassword: vi.fn() },
}));
function show(page: React.ReactNode) {
  return render(
    <StrictMode>
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter>{page}</MemoryRouter>
      </QueryClientProvider>
    </StrictMode>,
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  window.history.replaceState({}, '', '/');
});
describe('password recovery', () => {
  it('submits the institution and email and shows the actual server response', async () => {
    vi.mocked(authService.passwordHelp).mockResolvedValue({
      message: 'Kurum yöneticinizden bağlantı alın.',
    });
    show(<ForgotPasswordPage />);
    fireEvent.change(screen.getByLabelText('E-posta'), { target: { value: 'test@example.test' } });
    fireEvent.change(screen.getByLabelText('Kurum kodu'), { target: { value: 'test-osgb' } });
    fireEvent.click(screen.getByRole('button', { name: 'Destek talebi gönder' }));
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Kurum yöneticinizden bağlantı alın.',
    );
    expect(authService.passwordHelp).toHaveBeenCalledWith('test@example.test', 'test-osgb');
  });
  it('does not show a reset form without a valid link', () => {
    show(<ResetPasswordPage />);
    expect(screen.getByRole('alert')).toHaveTextContent('Geçerli kurtarma bağlantısı bulunamadı');
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
  it('keeps the token in memory after removing it from the address bar in StrictMode', async () => {
    const token = 'a'.repeat(64);
    window.history.replaceState({}, '', `/reset-password#token=${token}`);
    vi.mocked(authService.resetPassword).mockResolvedValue({ message: 'Şifreniz yenilendi.' });
    show(<ResetPasswordPage />);
    expect(window.location.hash).toBe('');
    fireEvent.change(screen.getByLabelText('Yeni şifre'), { target: { value: 'Password1234' } });
    fireEvent.change(screen.getByLabelText('Yeni şifre (tekrar)'), {
      target: { value: 'Different1234' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Şifremi yenile' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Şifreler eşleşmiyor');
    expect(authService.resetPassword).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Yeni şifre (tekrar)'), {
      target: { value: 'Password1234' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Şifremi yenile' }));
    await waitFor(() =>
      expect(authService.resetPassword).toHaveBeenCalledWith(token, 'Password1234'),
    );
    expect(await screen.findByRole('status')).toHaveTextContent('Şifreniz yenilendi.');
  });
});
