import { QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import type { ReactElement } from 'react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import {
  buildAssociationReport,
  buildReport,
  buildReportColumn,
  buildReportTotal,
} from '@/test/factories';
import { createTestQueryClient } from '@/test/render';

import { ReportPanel } from './report-panel';

const BASE = {
  view: 'producer',
  filters: {
    type: 'production',
    from: '2026-01-01',
    to: '2026-03-31',
    producer: null,
    municipality: null,
    farm: 'f1',
    plot: null,
    lot: null,
  },
} as const;

// La exportación pide su consulta: el panel necesita el cliente de consultas.
const renderPanel = (panel: ReactElement) =>
  render(
    <QueryClientProvider client={createTestQueryClient()}>
      {panel}
    </QueryClientProvider>,
  );

const headers = () =>
  screen.getAllByRole('columnheader').map((header) => header.textContent);

const cells = (row: number) =>
  within(screen.getAllByRole('row')[row])
    .getAllByRole('cell')
    .map((cell) => cell.textContent);

describe('ReportPanel', () => {
  it('says what the report is, with which filters and when', () => {
    renderPanel(<ReportPanel {...BASE} report={buildReport()} />);

    const report = screen.getByRole('region', { name: 'Producción' });
    expect(report).toHaveTextContent(
      'Periodo: 01/01/2026 – 31/03/2026 · Finca: F01 · La Esperanza',
    );
    expect(report).toHaveTextContent(
      'Generado el 31/03/2026 a las 10:15 por Ana Ejemplo',
    );
  });

  it('shows the totals as the server sends them', () => {
    renderPanel(<ReportPanel {...BASE} report={buildReport()} />);

    const totals = screen.getByRole('region', { name: 'Totales del reporte' });
    expect(totals).toHaveTextContent('Cosechas2');
    expect(totals).toHaveTextContent('Kg en baba150,0 kg');
    expect(totals).toHaveTextContent('Kg seco40,5 kg');
  });

  // La tabla no conoce los tipos: un tipo que no existe hoy se dibuja igual.
  it('draws any report from its columns, with the figures to the right', () => {
    renderPanel(
      <ReportPanel
        {...BASE}
        report={buildReport({
          type: 'fertilization',
          title: 'Abonos',
          columns: [
            buildReportColumn({ key: 'input', label: 'Insumo', kind: 'text' }),
            buildReportColumn({
              key: 'applied_on',
              label: 'Fecha',
              kind: 'date',
            }),
            buildReportColumn({ key: 'cost', label: 'Costo', kind: 'money' }),
          ],
          rows: [
            { input: 'Abono orgánico', applied_on: '2026-02-03', cost: 85000 },
          ],
          totals: [],
        })}
      />,
    );

    expect(headers()).toEqual(['Insumo', 'Fecha', 'Costo']);
    expect(cells(1)).toEqual([
      'Abono orgánico',
      'Fecha03/02/2026',
      'Costo$ 85.000',
    ]);
    expect(screen.getByRole('columnheader', { name: 'Costo' })).toHaveClass(
      'text-right',
    );
  });

  // Una etapa que no ha ocurrido no es un cero.
  it('shows a dash where there is no value', () => {
    renderPanel(<ReportPanel {...BASE} report={buildReport()} />);

    expect(cells(2)).toContain('Lote—');
  });

  it('joins the columns that go together in one cell', () => {
    renderPanel(
      <ReportPanel
        {...BASE}
        report={buildReport({
          type: 'traceability',
          title: 'Trazabilidad',
          columns: [
            buildReportColumn({ key: 'lot_code', label: 'Lote', kind: 'text' }),
            buildReportColumn({
              key: 'status',
              label: 'Estado actual',
              kind: 'text',
            }),
            buildReportColumn({
              key: 'drying_ended_on',
              label: 'Fin del secado',
              kind: 'date',
            }),
            buildReportColumn({ key: 'dry_kg', label: 'Kg seco', kind: 'kg' }),
            buildReportColumn({
              key: 'yield_pct',
              label: 'Rendimiento %',
              kind: 'pct',
            }),
          ],
          rows: [
            {
              lot_code: '000001-F01-P01-260203-1',
              status: 'En bodega',
              drying_ended_on: '2026-04-02',
              dry_kg: '40.5',
              yield_pct: '33.8',
            },
          ],
          totals: [],
        })}
      />,
    );

    expect(headers()).toEqual(['Lote', 'Secado']);
    expect(cells(1)).toEqual([
      '000001-F01-P01-260203-1En bodega',
      'Secado02/04/2026Kg seco 40,5 kgRendimiento % 33,8 %',
    ]);
  });

  // Nada por parcela ni por lote.
  it('shows the association one farm per row', () => {
    renderPanel(<ReportPanel {...BASE} report={buildAssociationReport()} />);

    expect(headers()).toEqual([
      'Finca',
      'Municipio',
      'Productor',
      'Kg vendidos',
    ]);
    expect(cells(2)).toEqual([
      'F02 · Villa Rosa',
      'MunicipioTibú',
      'ProductorPROD-000002 · Luis Prueba',
      'Kg vendidos0,0',
    ]);
  });

  // Sin filas no se dibuja una tabla vacía.
  it('says there are no results instead of an empty table, and offers to clear', async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    renderPanel(
      <ReportPanel
        {...BASE}
        onClear={onClear}
        report={buildReport({
          rows: [],
          totals: [buildReportTotal({ value: '0.0' })],
        })}
      />,
    );

    expect(
      screen.getByText('No hay resultados para estos filtros.'),
    ).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
    expect(
      screen.queryByRole('region', { name: 'Totales del reporte' }),
    ).toBeNull();

    await user.click(screen.getByRole('button', { name: 'Limpiar filtros' }));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it('offers nothing to clear when no filter is set', () => {
    renderPanel(<ReportPanel {...BASE} report={buildReport({ rows: [] })} />);

    expect(
      screen.queryByRole('button', { name: 'Limpiar filtros' }),
    ).toBeNull();
  });
});
