import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { formatDateRange } from '@/lib/date-range';
import { DateRangePicker } from './date-range-picker';

describe('DateRangePicker', () => {
  it('formats the selected range for the trigger', () => {
    expect(formatDateRange({ from: '2026-09-01', to: '2026-09-09' })).toBe(
      '01.09.2026 – 09.09.2026',
    );
    expect(formatDateRange({ from: '2026-09-01', to: '' })).toBe('01.09.2026 –');
    expect(formatDateRange({ from: '', to: '' })).toBe('');
  });

  it('shows the placeholder when empty and clears via the × button', () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <DateRangePicker id="r" value={{ from: '', to: '' }} onChange={onChange} />,
    );
    expect(screen.getByRole('button', { name: 'Tarih aralığı' })).toBeInTheDocument();
    rerender(
      <DateRangePicker
        id="r"
        value={{ from: '2026-09-01', to: '2026-09-09' }}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Tarih aralığını temizle' }));
    expect(onChange).toHaveBeenCalledWith({ from: '', to: '' });
  });

  it('applies a preset from the popover', async () => {
    // Only fake Date: findBy* polling needs real timers.
    vi.useFakeTimers({ toFake: ['Date'], now: new Date(2026, 8, 9, 12) });
    const onChange = vi.fn();
    render(<DateRangePicker id="r" value={{ from: '', to: '' }} onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'Tarih aralığı' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Son 7 gün' }));
    expect(onChange).toHaveBeenCalledWith({ from: '2026-09-03', to: '2026-09-09' });
    vi.useRealTimers();
  });
});
