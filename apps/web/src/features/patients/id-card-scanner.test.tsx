import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { IdCardScanner } from './id-card-scanner';

vi.mock('@/services/identity.service', () => ({
  identityService: { scan: vi.fn(), verify: vi.fn() },
}));

function renderScanner() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <IdCardScanner onApply={() => undefined} />
    </QueryClientProvider>,
  );
}

describe('IdCardScanner', () => {
  it('offers camera and file capture', () => {
    renderScanner();
    expect(screen.getByRole('button', { name: /Kameradan Tara/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Fotoğraf Seç/ })).toBeInTheDocument();
    expect(screen.getByLabelText('Kimlik kartı fotoğrafı seç')).toHaveAttribute(
      'accept',
      'image/*',
    );
  });

  it('explains the fallback when the browser has no camera API', async () => {
    renderScanner();
    fireEvent.click(screen.getByRole('button', { name: /Kameradan Tara/ }));
    expect(await screen.findByRole('dialog')).toBeInTheDocument();
    expect(await screen.findByRole('alert')).toHaveTextContent(/kamera erişimi desteklenmiyor/i);
    expect(screen.getByRole('button', { name: /Çek ve tara/ })).toBeDisabled();
  });
});
