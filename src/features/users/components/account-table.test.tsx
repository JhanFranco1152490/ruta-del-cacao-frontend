import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { Account } from '../api';
import { AccountTable } from './account-table';

const account = (overrides: Partial<Account> = {}): Account =>
  ({
    id: 'a1',
    email: 'ana@example.com',
    first_name: 'Ana',
    last_name: 'Cuenta',
    document_type: 'CC',
    identity_document: '1234567890',
    phone: null,
    producer: {
      id: 'p1',
      member_code: 'PROD-000007',
      first_name: 'Luis',
      last_name: 'Prueba',
      status: 'active',
      municipality_code: '54001',
    },
    roles: [{ id: 'r1', code: 'foreman', name: 'Capataz' }],
    status: 'active',
    activation_pending: false,
    has_signed_in: true,
    created_at: '2026-09-28T12:00:00Z',
    ...overrides,
  }) as Account;

describe('AccountTable and the producer of each account', () => {
  it('names the producer of each account for whoever has none of its own', () => {
    render(
      <AccountTable
        accounts={[account(), account({ id: 'a2', producer: null })]}
        open={vi.fn()}
        showProducer
      />,
    );

    const rows = screen.getAllByRole('row');
    expect(
      screen.getByRole('columnheader', { name: 'Productor' }),
    ).toBeVisible();
    expect(
      within(rows[1]).getByText('Luis Prueba · PROD-000007'),
    ).toBeVisible();
    // Las cuentas de la asociación no tienen productor.
    expect(within(rows[2]).getByText('Asociación')).toBeVisible();
  });

  it('has no such column for a producer, who only sees its own accounts', () => {
    render(<AccountTable accounts={[account()]} open={vi.fn()} />);

    expect(
      screen.queryByRole('columnheader', { name: 'Productor' }),
    ).not.toBeInTheDocument();
  });
});
