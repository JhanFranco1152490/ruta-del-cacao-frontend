import { describe, expect, it } from 'vitest';

import { PERIOD_ERROR_MESSAGE } from '@/lib/period';

import {
  type ReportFilterValues,
  reportQuery,
  TYPE_REQUIRED_MESSAGE,
  validateReportRequest,
} from './report-request';

const VALUES: ReportFilterValues & { type: 'production' } = {
  type: 'production',
  from: '2026-01-01',
  to: '2026-03-31',
  producer: 'p1',
  municipality: '54001',
  farm: 'f1',
  plot: 'pl1',
  lot: 'l1',
};

describe('validateReportRequest', () => {
  // CA-02 de HU-46: sin tipo no se genera nada.
  it('asks for the report type first', () => {
    expect(validateReportRequest({ ...VALUES, type: null })).toEqual({
      type: TYPE_REQUIRED_MESSAGE,
    });
  });

  // CA-03 de HU-46 y CA-04 de HU-47.
  it('rejects a period that ends before it starts', () => {
    expect(
      validateReportRequest({
        ...VALUES,
        from: '2026-03-31',
        to: '2026-01-01',
      }),
    ).toEqual({ period: PERIOD_ERROR_MESSAGE });
  });

  it('does not look at the period of the inventory', () => {
    expect(
      validateReportRequest({
        ...VALUES,
        type: 'inventory',
        from: '2026-03-31',
        to: '2026-01-01',
      }),
    ).toBeNull();
  });

  it('lets a complete request through', () => {
    expect(validateReportRequest(VALUES)).toBeNull();
  });
});

describe('reportQuery', () => {
  it('sends the producer its place filters and no municipality', () => {
    expect(reportQuery('producer', VALUES, { superuser: false })).toEqual({
      type: 'production',
      from: '2026-01-01',
      to: '2026-03-31',
      producer: null,
      municipality: null,
      farm: 'f1',
      plot: 'pl1',
      lot: 'l1',
    });
  });

  // Las demás cuentas ven su propia unidad productiva.
  it('sends the producer filter only from the technical account', () => {
    expect(reportQuery('producer', VALUES, { superuser: true }).producer).toBe(
      'p1',
    );
  });

  // CA-02 de HU-47: nada por parcela ni por lote.
  it('sends the association its filters and nothing by plot or lot', () => {
    expect(reportQuery('association', VALUES, { superuser: false })).toEqual({
      type: 'production',
      from: '2026-01-01',
      to: '2026-03-31',
      producer: 'p1',
      municipality: '54001',
      farm: 'f1',
      plot: null,
      lot: null,
    });
  });

  it('sends the inventory without a period', () => {
    const query = reportQuery(
      'producer',
      { ...VALUES, type: 'inventory' },
      { superuser: false },
    );

    expect(query).toMatchObject({ type: 'inventory', from: null, to: null });
  });
});
