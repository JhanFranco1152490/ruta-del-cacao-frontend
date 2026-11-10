import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { DemoAccounts } from './demo-accounts';

describe('DemoAccounts', () => {
  it('lists one account for each role the seed creates', async () => {
    render(<DemoAccounts onUse={vi.fn()} />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Cuentas de demostración' }),
    );

    for (const email of [
      'administrador@example.com',
      'productor@example.com',
      'capataz@example.com',
      'operario@example.com',
      'calidad@example.com',
      'comercializador@example.com',
    ]) {
      expect(screen.getByText(email)).toBeInTheDocument();
    }
  });

  it('fills the sign-in with the account chosen and the public password', async () => {
    const onUse = vi.fn();
    render(<DemoAccounts onUse={onUse} />);
    await userEvent.click(
      screen.getByRole('button', { name: 'Cuentas de demostración' }),
    );

    await userEvent.click(
      screen.getByRole('button', {
        name: 'Usar la cuenta Encargado de calidad',
      }),
    );

    expect(onUse).toHaveBeenCalledWith('calidad@example.com', 'CacaoDemo2026');
  });
});
