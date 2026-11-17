import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ScatterChart } from './scatter-chart';

const POINTS = [
  {
    key: 'a',
    label: 'La Esperanza',
    x: 720,
    y: 76.3,
    size: 210,
    color: 'green',
  },
  { key: 'b', label: 'Villa Rosa', x: 100, y: 60, size: 50, color: 'red' },
];

function renderChart(points = POINTS) {
  return render(
    <ScatterChart
      averageX={410}
      averageY={70}
      formatX={(value) => `${value} kg`}
      formatY={(value) => `${value} %`}
      label="Kilos y % de G1 por finca"
      points={points}
      xLabel="Kg en baba"
      yLabel="% de G1"
    />,
  );
}

describe('ScatterChart', () => {
  it('dibuja un círculo por punto, más grande el de más tamaño', () => {
    const { container } = renderChart();

    const [big, small] = [...container.querySelectorAll('circle')];
    expect(Number(big.getAttribute('r'))).toBeGreaterThan(
      Number(small.getAttribute('r')),
    );
  });

  it('lleva los mismos datos en una tabla para el lector de pantalla', () => {
    renderChart();

    const table = screen.getByRole('table', {
      name: 'Kilos y % de G1 por finca',
    });
    const [, first] = within(table).getAllByRole('row');
    expect(first).toHaveTextContent('La Esperanza720 kg76.3 %');
  });

  it('el dibujo es decorativo', () => {
    const { container } = renderChart();

    expect(container.querySelector('svg')).toHaveAttribute(
      'aria-hidden',
      'true',
    );
  });

  it('pone el nombre del punto de la derecha a su izquierda para que no se corte', () => {
    const { container } = renderChart();

    const [right, left] = [...container.querySelectorAll('svg text')].filter(
      (text) => ['La Esperanza', 'Villa Rosa'].includes(text.textContent ?? ''),
    );
    expect(right).toHaveAttribute('text-anchor', 'end');
    expect(left).toHaveAttribute('text-anchor', 'start');
  });
});
