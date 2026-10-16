import { describe, expect, it } from 'vitest';

import {
  historyQuery,
  OTHER_PEST_FILTER,
  PERIOD_INVERTED_MESSAGE,
} from './history-filters';

const none = { from: null, to: null, pest: null };

describe('historyQuery', () => {
  it('asks for everything without filters', () => {
    expect(historyQuery(none)).toEqual({ query: {} });
  });

  it('asks for a period and a pest of the catalog', () => {
    expect(
      historyQuery({ from: '2026-01-01', to: '2026-10-31', pest: 'monilia' }),
    ).toEqual({
      query: { from: '2026-01-01', to: '2026-10-31', pest_disease: 'monilia' },
    });
  });

  it('asks for what was written in Other with its own filter', () => {
    expect(historyQuery({ ...none, pest: OTHER_PEST_FILTER })).toEqual({
      query: { other: true },
    });
  });

  it('accepts a period of one day', () => {
    expect(
      historyQuery({ ...none, from: '2026-10-19', to: '2026-10-19' }),
    ).toEqual({ query: { from: '2026-10-19', to: '2026-10-19' } });
  });

  it('does not ask for a period whose start comes after its end', () => {
    expect(
      historyQuery({ ...none, from: '2026-10-20', to: '2026-10-19' }),
    ).toEqual({ error: PERIOD_INVERTED_MESSAGE });
  });
});
