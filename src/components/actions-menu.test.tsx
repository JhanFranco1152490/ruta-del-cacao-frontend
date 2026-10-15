import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { MenuItem } from '@/components/ui/menu';

import { ActionsMenu } from './actions-menu';

describe('ActionsMenu', () => {
  it('keeps the actions out of sight until the button is pressed', async () => {
    const user = userEvent.setup();
    const onDisable = vi.fn();
    render(
      <ActionsMenu label="Más acciones de Finca Yan">
        <MenuItem onClick={onDisable}>Desactivar</MenuItem>
      </ActionsMenu>,
    );

    expect(
      screen.queryByRole('menuitem', { name: 'Desactivar' }),
    ).not.toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Más acciones de Finca Yan' }),
    );
    await user.click(
      await screen.findByRole('menuitem', { name: 'Desactivar' }),
    );

    expect(onDisable).toHaveBeenCalledOnce();
    expect(
      screen.queryByRole('menuitem', { name: 'Desactivar' }),
    ).not.toBeInTheDocument();
  });
});
