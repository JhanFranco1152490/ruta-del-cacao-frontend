import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CollapsibleGroup } from './collapsible-group';

describe('CollapsibleGroup', () => {
  it('names the heading after the group only, not its count', () => {
    render(
      <CollapsibleGroup
        meta="3 en esta página"
        onToggle={vi.fn()}
        open
        title="Ana Prueba"
      >
        contenido
      </CollapsibleGroup>,
    );

    expect(
      screen.getByRole('heading', { level: 2, name: 'Ana Prueba' }),
    ).toBeInTheDocument();
    expect(screen.getByText('3 en esta página')).toBeInTheDocument();
  });

  it('shows the content only while open and reports the state', () => {
    const { rerender } = render(
      <CollapsibleGroup onToggle={vi.fn()} open title="Ana">
        contenido
      </CollapsibleGroup>,
    );
    expect(screen.getByText('contenido')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ana' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );

    rerender(
      <CollapsibleGroup onToggle={vi.fn()} open={false} title="Ana">
        contenido
      </CollapsibleGroup>,
    );
    expect(screen.queryByText('contenido')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Ana' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });

  it('asks to toggle when the title is pressed', async () => {
    const onToggle = vi.fn();
    render(
      <CollapsibleGroup onToggle={onToggle} open title="Ana">
        contenido
      </CollapsibleGroup>,
    );

    await userEvent.click(screen.getByRole('button', { name: 'Ana' }));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
