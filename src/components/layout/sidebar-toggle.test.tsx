import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { SidebarToggle } from './sidebar-toggle';

describe('SidebarToggle', () => {
  it('offers to hide the sidebar while it is visible', () => {
    render(<SidebarToggle hidden={false} onToggle={vi.fn()} />);

    const button = screen.getByRole('button', {
      name: 'Ocultar barra lateral',
    });
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(button).toHaveAttribute('aria-controls', 'barra-lateral');
  });

  it('offers to show the sidebar while it is hidden', () => {
    render(<SidebarToggle hidden onToggle={vi.fn()} />);

    const button = screen.getByRole('button', {
      name: 'Mostrar barra lateral',
    });
    expect(button).toHaveAttribute('aria-expanded', 'false');
  });

  it('asks to toggle when pressed', async () => {
    const onToggle = vi.fn();
    render(<SidebarToggle hidden={false} onToggle={onToggle} />);

    await userEvent.click(
      screen.getByRole('button', { name: 'Ocultar barra lateral' }),
    );

    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
