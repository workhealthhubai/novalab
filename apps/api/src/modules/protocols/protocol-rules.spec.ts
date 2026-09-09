import {
  canChangeItemStatus,
  deriveOpenStatus,
  formatProtocolNumber,
  isProtocolEditable,
  pendingItems,
} from './protocol-rules';

describe('protocol rules', () => {
  it('formats the yearly sequence with six digits', () => {
    expect(formatProtocolNumber(2026, 1)).toBe('2026-000001');
    expect(formatProtocolNumber(2026, 123456)).toBe('2026-123456');
  });

  it('only open/in-progress protocols are editable', () => {
    expect(isProtocolEditable('OPEN')).toBe(true);
    expect(isProtocolEditable('IN_PROGRESS')).toBe(true);
    expect(isProtocolEditable('COMPLETED')).toBe(false);
    expect(isProtocolEditable('CANCELLED')).toBe(false);
  });

  it('derives IN_PROGRESS from the first completed item and back to OPEN when none is done', () => {
    expect(deriveOpenStatus('OPEN', [{ status: 'PENDING' }, { status: 'CANCELLED' }])).toBe('OPEN');
    expect(deriveOpenStatus('OPEN', [{ status: 'DONE' }, { status: 'PENDING' }])).toBe(
      'IN_PROGRESS',
    );
    expect(deriveOpenStatus('IN_PROGRESS', [{ status: 'PENDING' }])).toBe('OPEN');
    expect(deriveOpenStatus('COMPLETED', [{ status: 'PENDING' }])).toBe('COMPLETED');
  });

  it('allows reopening items but never skips the pending state from cancelled to done', () => {
    expect(canChangeItemStatus('PENDING', 'DONE')).toBe(true);
    expect(canChangeItemStatus('DONE', 'PENDING')).toBe(true);
    expect(canChangeItemStatus('CANCELLED', 'DONE')).toBe(false);
    expect(canChangeItemStatus('CANCELLED', 'PENDING')).toBe(true);
    expect(canChangeItemStatus('DONE', 'DONE')).toBe(true);
  });

  it('lists the items that block closing', () => {
    expect(
      pendingItems([{ status: 'DONE' }, { status: 'PENDING' }, { status: 'CANCELLED' }]),
    ).toEqual([{ status: 'PENDING' }]);
  });
});
