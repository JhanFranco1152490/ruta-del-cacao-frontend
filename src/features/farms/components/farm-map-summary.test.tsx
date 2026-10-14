import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { FarmMapSummary } from './farm-map-summary';

const NAMES: Record<string, string> = {
  '54001': 'Cúcuta',
  '54518': 'Pamplona',
  '54810': 'Tibú',
  '54498': 'Ocaña',
};

function renderSummary(
  counts: { code: string; count: number }[],
  onSelect = vi.fn(),
) {
  render(
    <FarmMapSummary
      counts={counts}
      municipalityName={(code) => NAMES[code] ?? code}
      onSelect={onSelect}
    />,
  );
  return onSelect;
}

const rows = () =>
  within(screen.getByRole('list'))
    .getAllByRole('button')
    .map((button) => button.getAttribute('aria-label'));

describe('FarmMapSummary', () => {
  it('adds the farms of every municipality and says in how many there are', () => {
    renderSummary([
      { code: '54001', count: 12 },
      { code: '54810', count: 6 },
      { code: '54518', count: 1 },
    ]);

    expect(screen.getByText('19 fincas')).toBeInTheDocument();
    expect(screen.getByText('en 3 municipios')).toBeInTheDocument();
  });

  it('lists the municipalities from most to fewest farms, by name on a tie', () => {
    renderSummary([
      { code: '54810', count: 6 },
      { code: '54518', count: 6 },
      { code: '54001', count: 12 },
    ]);

    expect(rows()).toEqual([
      'Cúcuta: 12 fincas. Ver en el mapa',
      'Pamplona: 6 fincas. Ver en el mapa',
      'Tibú: 6 fincas. Ver en el mapa',
    ]);
  });

  it('does not list a municipality without farms, and speaks in the singular', () => {
    renderSummary([
      { code: '54001', count: 1 },
      { code: '54810', count: 0 },
    ]);

    expect(screen.getByText('1 finca')).toBeInTheDocument();
    expect(screen.getByText('en 1 municipio')).toBeInTheDocument();
    expect(rows()).toEqual(['Cúcuta: 1 finca. Ver en el mapa']);
  });

  it('says so when there is nothing to show', () => {
    renderSummary([]);

    expect(screen.getByText('0 fincas')).toBeInTheDocument();
    expect(
      screen.getByText('Aún no hay fincas en el mapa.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('takes the map to the municipality chosen', async () => {
    const onSelect = renderSummary([
      { code: '54001', count: 12 },
      { code: '54498', count: 7 },
    ]);

    await userEvent.click(
      screen.getByRole('button', { name: 'Ocaña: 7 fincas. Ver en el mapa' }),
    );

    expect(onSelect).toHaveBeenCalledWith('54498');
  });
});
