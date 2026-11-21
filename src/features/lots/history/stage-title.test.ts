import { describe, expect, it } from 'vitest';

import { buildHistoryStage } from '@/test/lot-history-factories';

import { stageTitle } from './stage-title';

describe('stageTitle', () => {
  it('names each stage of the process', () => {
    expect(stageTitle(buildHistoryStage('harvest'))).toBe('Cosecha');
    expect(stageTitle(buildHistoryStage('lot_created'))).toBe(
      'Lote conformado',
    );
    expect(stageTitle(buildHistoryStage('evaluation'))).toBe(
      'Evaluación de calidad',
    );
    expect(stageTitle(buildHistoryStage('discard'))).toBe('Lote descartado');
    expect(stageTitle(buildHistoryStage('stock_move'))).toBe('Cambio de lugar');
  });

  it('says the reason of an exit, and with Otro what was written', () => {
    expect(stageTitle(buildHistoryStage('stock_exit'))).toBe(
      'Salida de bodega: Muestra',
    );
    expect(
      stageTitle(
        buildHistoryStage('stock_exit', {
          reason: 'other',
          detail: 'Regalo a un cliente',
        }),
      ),
    ).toBe('Salida de bodega: Regalo a un cliente');
  });

  it('says the number of a sale', () => {
    expect(stageTitle(buildHistoryStage('sale'))).toBe('Venta V-0012');
  });
});
