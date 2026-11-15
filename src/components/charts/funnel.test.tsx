import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Funnel } from './funnel';

const STEPS = [
  {
    key: 'green',
    label: 'En baba',
    kg: 1000,
    valueLabel: '1000 kg',
    note: 'cosechado',
    color: 'red',
  },
  {
    key: 'classified',
    label: 'Clasificado',
    kg: 200,
    valueLabel: '200 kg',
    note: 'G1, G2 y descarte',
    color: 'green',
    parts: [
      { key: 'g1', label: 'G1', kg: 150, color: 'green' },
      { key: 'g2', label: 'G2', kg: 50, color: 'yellow' },
    ],
  },
  {
    key: 'sold',
    label: 'Vendido',
    kg: 0,
    valueLabel: '0 kg',
    note: 'sin ventas',
    color: 'blue',
  },
];

const heightOf = (item: HTMLElement) =>
  (item.querySelector('[style*="height"]') as HTMLElement).style.height;

describe('Funnel', () => {
  it('escribe el valor, el nombre y la nota de cada paso', () => {
    render(<Funnel label="Kilos en cada paso" steps={STEPS} />);

    const [first] = within(
      screen.getByRole('list', { name: 'Kilos en cada paso' }),
    ).getAllByRole('listitem');
    expect(first).toHaveTextContent('1000 kg');
    expect(first).toHaveTextContent('En baba');
    expect(first).toHaveTextContent('cosechado');
  });

  it('dibuja cada paso a la escala del mayor, y uno en cero sin altura', () => {
    render(<Funnel label="Kilos en cada paso" steps={STEPS} />);

    const [green, classified, sold] = within(
      screen.getByRole('list'),
    ).getAllByRole('listitem');
    expect(heightOf(green)).toBe('100%');
    expect(heightOf(classified)).toBe('20%');
    expect(heightOf(sold)).toBe('0%');
  });

  it('reparte un paso en sus partes', () => {
    render(<Funnel label="Kilos en cada paso" steps={STEPS} />);

    const [, classified] = within(screen.getByRole('list')).getAllByRole(
      'listitem',
    );
    expect(classified.querySelectorAll('[title]')).toHaveLength(2);
  });
});
