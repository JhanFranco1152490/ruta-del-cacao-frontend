import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { buildHistoryStage } from '@/test/lot-history-factories';

import { DryingStage } from './drying-stage';
import { FermentationStage } from './fermentation-stage';

const renderEntry = (entry: ReactNode) => {
  render(<ol>{entry}</ol>);
  return screen.getByRole('listitem', { name: /Fermentación|Secado/ });
};

const valueOf = (entry: HTMLElement, label: string) =>
  within(entry).getByText(label, { selector: 'dt' }).nextElementSibling;

describe('the fermentation of a lot history', () => {
  it('shows its span, box and the summary of its turns', () => {
    const entry = renderEntry(
      <FermentationStage stage={buildHistoryStage('fermentation')} />,
    );

    expect(entry).toHaveTextContent('15 mar → 21 mar · 6 días');
    expect(valueOf(entry, 'Cajón')).toHaveTextContent('C-01');
    expect(valueOf(entry, 'Volteos')).toHaveTextContent('2 volteos');
    expect(valueOf(entry, 'Temperatura')).toHaveTextContent('38,0–47,5 °C');
    expect(valueOf(entry, 'pH del grano')).toHaveTextContent('4,20–5,10');
    expect(valueOf(entry, 'Último volteo')).toHaveTextContent('18 mar. 08:00');
  });

  it('opens and closes its turns', async () => {
    const user = userEvent.setup();
    const entry = renderEntry(
      <FermentationStage stage={buildHistoryStage('fermentation')} />,
    );
    const toggle = within(entry).getByRole('button', {
      name: 'Ver los 2 volteos',
    });
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
    expect(
      within(entry).queryByText('17 mar. 08:00 · 38,0 °C · pH 5,10'),
    ).not.toBeVisible();

    await user.click(toggle);

    expect(toggle).toHaveAttribute('aria-expanded', 'true');
    expect(
      within(entry).getByText('17 mar. 08:00 · 38,0 °C · pH 5,10'),
    ).toBeVisible();
    expect(
      within(entry).getByText('18 mar. 08:00 · 47,5 °C · pH 4,20'),
    ).toBeVisible();

    await user.click(within(entry).getByRole('button', { name: 'Ocultar' }));
    expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows a fermentation still going, before its first turn', () => {
    const entry = renderEntry(
      <FermentationStage
        stage={buildHistoryStage('fermentation', {
          ended_at: null,
          days: 1,
          turn_count: 0,
          temperature_min_c: null,
          temperature_max_c: null,
          ph_min: null,
          ph_max: null,
          last_turn_at: null,
          turns: [],
        })}
      />,
    );

    expect(entry).toHaveTextContent('Desde el 15 mar, en curso · 1 día');
    expect(valueOf(entry, 'Volteos')).toHaveTextContent('Sin volteos');
    expect(within(entry).queryByText('Temperatura')).not.toBeInTheDocument();
    expect(within(entry).queryByRole('button')).not.toBeInTheDocument();
  });
});

describe('the drying of a lot history', () => {
  it('shows what a finished drying gave', () => {
    const entry = renderEntry(
      <DryingStage stage={buildHistoryStage('drying')} />,
    );

    expect(entry).toHaveTextContent('21 mar → 28 mar · 8 días');
    expect(valueOf(entry, 'Marquesina')).toHaveTextContent('M-01');
    expect(valueOf(entry, 'Humedad de entrada')).toHaveTextContent('55,0 %');
    expect(valueOf(entry, 'Bitácora')).toHaveTextContent('2 días registrados');
    expect(valueOf(entry, 'Horas de sol')).toHaveTextContent('14,0 h');
    expect(valueOf(entry, 'Humedad final')).toHaveTextContent('7,0 %');
    expect(valueOf(entry, 'Peso seco')).toHaveTextContent('45,0 kg');
    expect(valueOf(entry, 'Rendimiento')).toHaveTextContent('37,5 %');
    expect(within(entry).queryByText('Última humedad')).not.toBeInTheDocument();
  });

  it('opens its log day by day', async () => {
    const user = userEvent.setup();
    const entry = renderEntry(
      <DryingStage stage={buildHistoryStage('drying')} />,
    );

    await user.click(
      within(entry).getByRole('button', { name: 'Ver los 2 días' }),
    );

    expect(
      within(entry).getByText(
        'Día 2 · 22 mar · 7,5 % · 8,0 h de sol · Parcialmente nublado',
      ),
    ).toBeVisible();
  });

  it('shows the last moisture of a drying still going, without a result', () => {
    const entry = renderEntry(
      <DryingStage
        stage={buildHistoryStage('drying', {
          ended_at: null,
          final_moisture_pct: null,
          dry_weight_kg: null,
          yield_pct: null,
        })}
      />,
    );

    expect(entry).toHaveTextContent('Desde el 21 mar, en curso');
    expect(valueOf(entry, 'Última humedad')).toHaveTextContent('7,5 %');
    expect(within(entry).queryByText('Rendimiento')).not.toBeInTheDocument();
  });
});
