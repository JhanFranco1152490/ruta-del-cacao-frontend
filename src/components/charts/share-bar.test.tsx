import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ShareBar } from './share-bar';

const SEGMENTS = [
  {
    key: 'g1',
    label: 'G1',
    percent: 76.3,
    percentLabel: '76,3 %',
    valueLabel: '290 kg',
    color: 'green',
  },
  {
    key: 'g2',
    label: 'G2',
    percent: 18.4,
    percentLabel: '18,4 %',
    valueLabel: '70 kg',
    color: 'yellow',
  },
  {
    key: 'discard',
    label: 'Descarte',
    percent: 0,
    percentLabel: '0 %',
    valueLabel: '0 kg',
    color: 'red',
  },
];

describe('ShareBar', () => {
  it('resume el reparto para el lector de pantalla', () => {
    render(<ShareBar label="Calidad" segments={SEGMENTS} />);

    expect(
      screen.getByRole('img', {
        name: 'Calidad: G1 76,3 %, G2 18,4 %, Descarte 0 %',
      }),
    ).toBeInTheDocument();
  });

  it('escribe cada parte, porque el color solo no dice nada', () => {
    render(<ShareBar label="Calidad" segments={SEGMENTS} />);

    expect(screen.getByText('76,3 % · 290 kg')).toBeInTheDocument();
    expect(screen.getByText('0 % · 0 kg')).toBeInTheDocument();
  });

  it('compacta deja una sola línea en lugar de la leyenda', () => {
    render(<ShareBar compact label="Calidad" segments={SEGMENTS} />);

    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(
      screen.getByText('G1 76,3 %, G2 18,4 %, Descarte 0 %'),
    ).toBeInTheDocument();
  });

  it('sin total la barra queda vacía y dice que no hay datos', () => {
    const empty = SEGMENTS.map((segment) => ({
      ...segment,
      percent: null,
      percentLabel: '—',
    }));
    const { container } = render(<ShareBar label="Calidad" segments={empty} />);

    expect(container.querySelectorAll('[style*="flex-grow"]')).toHaveLength(0);
    expect(screen.getByRole('img')).toHaveAccessibleName(
      'Calidad: G1 —, G2 —, Descarte —',
    );
  });
});
