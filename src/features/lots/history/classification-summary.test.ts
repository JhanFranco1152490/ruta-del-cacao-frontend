import { describe, expect, it } from 'vitest';

import { buildHistoryStage } from '@/test/lot-history-factories';

import {
  fullDiscardText,
  gradesText,
  partialDiscardText,
} from './classification-summary';

const classification = (
  data: Parameters<typeof buildHistoryStage<'classification'>>[1] = {},
) => buildHistoryStage('classification', data).classification;

describe('gradesText', () => {
  it('says the kilos and the share of each grade', () => {
    expect(gradesText(classification())).toBe(
      '32,5 kg G1 (72,2 %) · 8,0 kg G2 (17,8 %)',
    );
  });

  it('says only the kilos when there is no share', () => {
    expect(gradesText(classification({ g1_pct: null, g2_pct: null }))).toBe(
      '32,5 kg G1 · 8,0 kg G2',
    );
  });
});

describe('partialDiscardText', () => {
  it('says how much was discarded and why', () => {
    expect(partialDiscardText(classification())).toBe(
      'Descarte: 4,5 kg por Moho',
    );
  });

  it('says what was written with Otro', () => {
    expect(
      partialDiscardText(
        classification({ discard_reason: 'other', discard_detail: 'Piedras' }),
      ),
    ).toBe('Descarte: 4,5 kg por Piedras');
  });

  it('says nothing when the classification discarded nothing', () => {
    expect(
      partialDiscardText(
        classification({
          discard_kg: '0.0',
          discard_reason: null,
          discard_pct: '0.0',
        }),
      ),
    ).toBeNull();
  });
});

describe('fullDiscardText', () => {
  it('says the reason and the kilos of the whole lot', () => {
    expect(fullDiscardText(buildHistoryStage('discard').discard)).toBe(
      'Lote descartado: Moho · 45,0 kg',
    );
  });
});
