import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ColumnChart } from './column-chart';

const SERIES = [
  { key: 'green', label: 'En baba', color: 'red' },
  { key: 'dry', label: 'Seco', color: 'blue' },
];
const GROUPS = [
  {
    key: '2026-01',
    tick: 'ene 26',
    title: 'enero de 2026',
    values: { green: 400, dry: 100 },
  },
  {
    key: '2026-02',
    tick: 'feb',
    title: 'febrero de 2026',
    values: { green: 0, dry: 0 },
  },
];
const format = (value: number) => `${value} kg`;

describe('ColumnChart', () => {
  it('da el mismo dato en una tabla para el lector de pantalla', () => {
    render(
      <ColumnChart
        formatValue={format}
        groups={GROUPS}
        label="Kilos por mes"
        series={SERIES}
      />,
    );

    const table = screen.getByRole('table', { name: 'Kilos por mes' });
    const [january, february] = within(table).getAllByRole('row').slice(1);
    expect(january).toHaveTextContent('enero de 2026400 kg100 kg');
    expect(february).toHaveTextContent('febrero de 2026');
  });

  it('muestra el valor mayor y la leyenda de cada serie', () => {
    render(
      <ColumnChart
        formatValue={format}
        groups={GROUPS}
        label="Kilos por mes"
        series={SERIES}
      />,
    );

    expect(screen.getByText('Mayor valor: 400 kg')).toBeInTheDocument();
    // Una vez en la leyenda y otra en el encabezado de la tabla del lector de pantalla.
    expect(screen.getAllByText('En baba')).toHaveLength(2);
    expect(screen.getAllByText('Seco')).toHaveLength(2);
  });

  it('un mes sin datos queda en cero y no divide por cero cuando todo está en cero', () => {
    const { container } = render(
      <ColumnChart
        formatValue={format}
        groups={[GROUPS[1]]}
        label="Kilos por mes"
        series={SERIES}
      />,
    );

    expect(screen.getByText('Mayor valor: 0 kg')).toBeInTheDocument();
    const bars = container.querySelectorAll<HTMLElement>('[style*="height"]');
    expect([...bars].map((bar) => bar.style.height)).toEqual(['0%', '0%']);
  });

  it('dice cada mes completo en su tooltip', () => {
    const { container } = render(
      <ColumnChart
        formatValue={format}
        groups={GROUPS}
        label="Kilos por mes"
        series={SERIES}
      />,
    );

    expect(container.querySelector('[title^="enero de 2026"]')).toHaveAttribute(
      'title',
      'enero de 2026: En baba 400 kg, Seco 100 kg',
    );
  });
});
