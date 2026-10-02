import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { AccountMenu } from './account-menu';

function renderMenu(props: Partial<Parameters<typeof AccountMenu>[0]> = {}) {
  const handlers = { onOpenAccount: vi.fn(), onLogout: vi.fn() };
  render(
    <AccountMenu
      label="ana@example.com"
      isLoggingOut={false}
      {...handlers}
      {...props}
    />,
  );
  return handlers;
}

const openMenu = () =>
  userEvent.click(
    screen.getByRole('button', { name: 'Cuenta de ana@example.com' }),
  );

describe('AccountMenu', () => {
  it('opens Mi cuenta from the email', async () => {
    const { onOpenAccount } = renderMenu();

    await openMenu();
    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'Mi cuenta' }),
    );

    expect(onOpenAccount).toHaveBeenCalled();
  });

  it('logs out from the menu', async () => {
    const { onLogout } = renderMenu();

    await openMenu();
    await userEvent.click(
      await screen.findByRole('menuitem', { name: 'Cerrar sesión' }),
    );

    expect(onLogout).toHaveBeenCalled();
  });

  it('does not log out twice while the request is in flight', async () => {
    const { onLogout } = renderMenu({ isLoggingOut: true });

    await openMenu();
    const item = await screen.findByRole('menuitem', { name: 'Cerrar sesión' });
    expect(item).toHaveAttribute('aria-disabled', 'true');
    await userEvent.click(item);

    expect(onLogout).not.toHaveBeenCalled();
  });
});
