import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { ActivityFiltersToggle } from './activity-filters-toggle';

describe('ActivityFiltersToggle', () => {
  it('keeps the filters out of sight until the button is touched', async () => {
    render(
      <ActivityFiltersToggle activeCount={0}>
        <p>Los filtros</p>
      </ActivityFiltersToggle>,
    );
    const button = screen.getByRole('button', { name: 'Filtros' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByText('Los filtros')).not.toBeVisible();

    await userEvent.click(button);

    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByText('Los filtros')).toBeVisible();
  });

  it('hides them again with a second touch', async () => {
    render(
      <ActivityFiltersToggle activeCount={0}>
        <p>Los filtros</p>
      </ActivityFiltersToggle>,
    );
    const button = screen.getByRole('button', { name: 'Filtros' });

    await userEvent.click(button);
    await userEvent.click(button);

    expect(screen.getByText('Los filtros')).not.toBeVisible();
  });

  it('says how many filters are set', () => {
    render(
      <ActivityFiltersToggle activeCount={2}>
        <p>Los filtros</p>
      </ActivityFiltersToggle>,
    );

    expect(screen.getByRole('button', { name: /Filtros/ })).toHaveTextContent(
      '2',
    );
  });

  it('shows no number when there are none', () => {
    render(
      <ActivityFiltersToggle activeCount={0}>
        <p>Los filtros</p>
      </ActivityFiltersToggle>,
    );

    expect(
      screen.getByRole('button', { name: 'Filtros' }),
    ).not.toHaveTextContent(/\d/);
  });
});
