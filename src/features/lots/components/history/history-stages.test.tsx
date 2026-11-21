import { render, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it } from 'vitest';

import { buildHistoryStage } from '@/test/lot-history-factories';

import { ClassificationStage } from './classification-stage';
import { DiscardStage } from './discard-stage';
import { EvaluationStage } from './evaluation-stage';
import { HarvestStage } from './harvest-stage';
import { LotCreatedStage } from './lot-created-stage';
import { SaleStage } from './sale-stage';
import { StockEntryStage } from './stock-entry-stage';
import { StockExitStage } from './stock-exit-stage';
import { StockMoveStage } from './stock-move-stage';

const renderEntry = (entry: ReactNode) => {
  render(<ol>{entry}</ol>);
  return screen.getByRole('listitem');
};

// El valor que acompaña a una etiqueta de `KeyValues`.
const valueOf = (entry: HTMLElement, label: string) =>
  within(entry).getByText(label, { selector: 'dt' }).nextElementSibling;

describe('the stages of a lot history', () => {
  it('shows the harvest with its date, variety, kilos, collector and plot record', () => {
    const entry = renderEntry(
      <HarvestStage stage={buildHistoryStage('harvest')} />,
    );

    expect(entry).toHaveAccessibleName('Cosecha');
    expect(entry).toHaveTextContent('14 de marzo de 2026');
    expect(valueOf(entry, 'Variedad')).toHaveTextContent('CCN-51');
    expect(valueOf(entry, 'Cacao en baba')).toHaveTextContent('120,0 kg');
    expect(valueOf(entry, 'Recolector')).toHaveTextContent(
      'Recolector de prueba',
    );
    expect(valueOf(entry, 'Ficha de la parcela')).toHaveTextContent(
      'Versión 3',
    );
  });

  it('shows who formed the lot, or a deleted account', () => {
    const entry = renderEntry(
      <LotCreatedStage
        stage={buildHistoryStage('lot_created', { created_by: null })}
      />,
    );

    expect(entry).toHaveTextContent('14 de marzo de 2026, 3:20 p.m.');
    expect(valueOf(entry, 'Conformó')).toHaveTextContent(
      'Una cuenta eliminada',
    );
  });

  it('shows the evaluation and when it was corrected', () => {
    const entry = renderEntry(
      <EvaluationStage
        stage={buildHistoryStage('evaluation', {
          corrected_at: '2026-04-01T15:00:00-05:00',
        })}
      />,
    );

    expect(valueOf(entry, 'Bien fermentados')).toHaveTextContent('85,0 %');
    expect(valueOf(entry, 'Con moho')).toHaveTextContent('2,0 %');
    expect(valueOf(entry, 'Otros defectos')).toHaveTextContent('3,0 %');
    expect(valueOf(entry, 'Corregida')).toHaveTextContent(
      '1 de abril de 2026, 3:00 p.m.',
    );
  });

  it('does not say an evaluation was corrected when it was not', () => {
    const entry = renderEntry(
      <EvaluationStage stage={buildHistoryStage('evaluation')} />,
    );

    expect(within(entry).queryByText('Corregida')).not.toBeInTheDocument();
  });

  it('shows the classification with its partial discard, date and reason', () => {
    const entry = renderEntry(
      <ClassificationStage stage={buildHistoryStage('classification')} />,
    );

    expect(entry).toHaveTextContent('2 de abril de 2026');
    expect(valueOf(entry, 'Resultado')).toHaveTextContent(
      '32,5 kg G1 (72,2 %) · 8,0 kg G2 (17,8 %)',
    );
    expect(within(entry).getByText('Descarte: 4,5 kg por Moho')).toBeVisible();
  });

  it('does not show a discard when the classification kept everything', () => {
    const entry = renderEntry(
      <ClassificationStage
        stage={buildHistoryStage('classification', {
          discard_kg: '0.0',
          discard_pct: '0.0',
          discard_reason: null,
        })}
      />,
    );

    expect(entry).not.toHaveTextContent('Descarte');
  });

  it('shows a discarded lot with its date, kilos and reason', () => {
    const entry = renderEntry(
      <DiscardStage
        stage={buildHistoryStage('discard', {
          reason: 'other',
          detail: 'Contaminado con humo',
        })}
      />,
    );

    expect(entry).toHaveAccessibleName('Lote descartado');
    expect(entry).toHaveTextContent('2 de abril de 2026');
    expect(
      within(entry).getByText(
        'Lote descartado: Contaminado con humo · 45,0 kg',
      ),
    ).toBeVisible();
  });

  it('shows where the cacao entered and where it moved', () => {
    const entry = renderEntry(
      <StockEntryStage
        stage={buildHistoryStage('stock_entry', { location: '' })}
      />,
    );
    expect(valueOf(entry, 'Bodega')).toHaveTextContent(/^Bodega principal$/);
    expect(valueOf(entry, 'G1')).toHaveTextContent('32,5 kg');
    expect(valueOf(entry, 'G2')).toHaveTextContent('8,0 kg');
  });

  it('shows a change of place from and to', () => {
    const entry = renderEntry(
      <StockMoveStage stage={buildHistoryStage('stock_move')} />,
    );

    expect(valueOf(entry, 'De')).toHaveTextContent(
      'Bodega principal · Estante 1',
    );
    expect(valueOf(entry, 'A')).toHaveTextContent(
      'Bodega principal · Estante 3',
    );
  });

  it('marks a voided exit and strikes its kilos', () => {
    const entry = renderEntry(
      <StockExitStage
        stage={buildHistoryStage('stock_exit', {
          voided_at: '2026-04-11T09:00:00-05:00',
          voided_by: 'Bodeguero de prueba',
          void_reason: 'Se registró dos veces',
        })}
      />,
    );

    expect(entry).toHaveAccessibleName('Salida de bodega: Muestra');
    expect(within(entry).getByText('Anulada')).toBeVisible();
    expect(within(entry).getByText('0,5 kg')).toHaveClass('line-through');
    expect(entry).toHaveTextContent(
      'Anulada el 11 de abril de 2026 por Bodeguero de prueba: Se registró dos veces',
    );
  });

  it('shows a sale with the kilos of this lot and no price', () => {
    const entry = renderEntry(<SaleStage stage={buildHistoryStage('sale')} />);

    expect(entry).toHaveAccessibleName('Venta V-0012');
    expect(valueOf(entry, 'Comprador')).toHaveTextContent(
      'Comprador de prueba S.A.S.',
    );
    expect(within(entry).getByText('20,0 kg')).not.toHaveClass('line-through');
    expect(entry).not.toHaveTextContent('$');
    expect(within(entry).queryByText('Anulada')).not.toBeInTheDocument();
  });

  it('marks a voided sale', () => {
    const entry = renderEntry(
      <SaleStage
        stage={buildHistoryStage('sale', {
          voided_at: '2026-04-22T10:00:00-05:00',
          void_reason: 'Venta repetida',
        })}
      />,
    );

    expect(within(entry).getByText('Anulada')).toBeVisible();
    expect(within(entry).getByText('20,0 kg')).toHaveClass('line-through');
    expect(entry).toHaveTextContent(
      'Anulada el 22 de abril de 2026: Venta repetida',
    );
  });
});
