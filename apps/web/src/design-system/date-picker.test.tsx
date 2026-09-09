import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DatePicker } from './date-picker';

describe('DatePicker', () => {
  it('masks typed digits and emits an ISO date once complete', () => {
    const onChange = vi.fn();
    render(<DatePicker id="d" value="" onChange={onChange} />);
    const input = screen.getByPlaceholderText('gg.aa.yyyy');
    fireEvent.change(input, { target: { value: '0102' } });
    expect(input).toHaveValue('01.02');
    expect(onChange).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: '01021990' } });
    expect(input).toHaveValue('01.02.1990');
    expect(onChange).toHaveBeenLastCalledWith('1990-02-01');
  });

  it('shows the ISO value as dd.MM.yyyy and passes an impossible date through for validation', () => {
    const onChange = vi.fn();
    render(<DatePicker id="d" value="2001-12-31" onChange={onChange} />);
    const input = screen.getByDisplayValue('31.12.2001');
    fireEvent.change(input, { target: { value: '31.02.2001' } });
    expect(onChange).toHaveBeenLastCalledWith('31.02.2001');
  });

  it('opens a calendar from the button', async () => {
    render(<DatePicker id="d" value="1990-02-01" onChange={() => undefined} />);
    fireEvent.click(screen.getByRole('button', { name: 'Takvimden seç' }));
    expect(await screen.findByRole('grid')).toBeInTheDocument();
  });
});
