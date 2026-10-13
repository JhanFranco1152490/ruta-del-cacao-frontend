import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ActivityViewSwitch } from './activity-view-switch';

describe('ActivityViewSwitch', () => {
  it('offers the five views and marks the one that is open', () => {
    render(<ActivityViewSwitch onChange={vi.fn()} value="semana" />);

    const group = screen.getByRole('group', { name: 'Vista del calendario' });
    expect(group).toBeInTheDocument();
    expect(
      screen.getAllByRole('button').map((button) => button.textContent),
    ).toEqual(['Mes', 'Semana', 'Lista', 'Por parcela', 'Pendientes']);
    expect(screen.getByRole('button', { name: 'Semana' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(screen.getByRole('button', { name: 'Mes' })).toHaveAttribute(
      'aria-pressed',
      'false',
    );
  });

  it('changes the view', async () => {
    const onChange = vi.fn();
    render(<ActivityViewSwitch onChange={onChange} value="mes" />);

    await userEvent.click(screen.getByRole('button', { name: 'Por parcela' }));

    expect(onChange).toHaveBeenCalledWith('parcela');
  });
});
