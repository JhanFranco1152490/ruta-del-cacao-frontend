import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { BarList } from './bar-list';

const ROWS = [
  {
    key: 'a',
    label: 'F01 · P01',
    value: 620,
    valueLabel: '620 kg',
    detail: '248 kg/ha',
  },
  { key: 'b', label: 'F01 · P02', value: 0, valueLabel: '0 kg' },
  { key: 'c', label: 'F02 · P01', value: 1, valueLabel: '1 kg' },
];

const widthOf = (item: HTMLElement) =>
  (item.querySelector('[style*="width"]') as HTMLElement | null)?.style.width;

describe('BarList', () => {
  it('escribe el valor y el detalle de cada fila', () => {
    render(<BarList label="Kilos por parcela" rows={ROWS} />);

    const [first] = within(
      screen.getByRole('list', { name: 'Kilos por parcela' }),
    ).getAllByRole('listitem');
    expect(first).toHaveTextContent('F01 · P01');
    expect(first).toHaveTextContent('620 kg');
    expect(first).toHaveTextContent('248 kg/ha');
  });

  it('mide todas las barras contra la mayor y no deja desaparecer la que tiene algo', () => {
    render(<BarList label="Kilos" rows={ROWS} />);

    const [first, zero, tiny] = screen.getAllByRole('listitem');
    expect(widthOf(first)).toBe('100%');
    expect(widthOf(zero)).toBe('0%');
    expect(widthOf(tiny)).toBe('2%');
  });

  it('sin filas no dibuja nada que medir', () => {
    render(<BarList label="Kilos" rows={[]} />);

    expect(screen.queryAllByRole('listitem')).toHaveLength(0);
  });
});
