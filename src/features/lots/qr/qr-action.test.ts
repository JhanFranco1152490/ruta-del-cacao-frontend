import { describe, expect, it } from 'vitest';

import { LOT_STATUS_VALUES } from '@/lib/lot-status';

import { qrAction } from './qr-action';

const QR = {
  token: 'Xq3k9Lm2Pz7tRw1a',
  public_url: 'https://app.example.com/trazabilidad/Xq3k9Lm2Pz7tRw1a',
  created_at: '2026-11-21T09:15:00-05:00',
};

describe('qrAction', () => {
  it.each(['classified', 'in_warehouse'] as const)(
    'offers to generate it for a %s lot without a code when the account may',
    (status) => {
      expect(qrAction({ status, qr: null }, true)).toBe('generate');
    },
  );

  it('offers nothing to an account that cannot generate and has no code to see', () => {
    expect(qrAction({ status: 'classified', qr: null }, false)).toBe('none');
  });

  it.each(
    LOT_STATUS_VALUES.filter(
      (s) => !['classified', 'in_warehouse'].includes(s),
    ),
  )('offers nothing for a %s lot, not even to who may generate', (status) => {
    expect(qrAction({ status, qr: null }, true)).toBe('none');
  });

  it('lets anyone who reads the lot see the code that already exists', () => {
    expect(qrAction({ status: 'in_warehouse', qr: QR }, false)).toBe('view');
  });

  it('shows the existing code and never offers a second one', () => {
    expect(qrAction({ status: 'classified', qr: QR }, true)).toBe('view');
  });
});
