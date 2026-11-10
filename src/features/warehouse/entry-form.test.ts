import { describe, expect, it } from 'vitest';

import { REQUIRED_FIELD_MESSAGE } from '@/lib/validation/messages';
import { buildLotStock, buildStockEntry } from '@/test/factories';

import {
  createEntryFormSchema,
  entryFormOf,
  toEntryCorrection,
  toEntryRequest,
  WAREHOUSE_REQUIRED_MESSAGE,
} from './entry-form';
import {
  DATE_IN_FUTURE_MESSAGE,
  ENTRY_BEFORE_CLASSIFICATION_MESSAGE,
} from './warehouse-dates';

const schema = createEntryFormSchema({
  today: '2026-10-31',
  classifiedAt: '2026-10-29T15:00:00-05:00',
});

const issuesOf = (values: {
  entry_date: string;
  warehouse_id: string;
  location: string;
}) =>
  schema
    .safeParse(values)
    .error?.issues.map(({ path, message }) => [path[0], message]);

describe('createEntryFormSchema', () => {
  it('accepts a full entry', () => {
    expect(
      issuesOf({
        entry_date: '2026-10-30',
        warehouse_id: 'w1',
        location: 'Estante 3',
      }),
    ).toBeUndefined();
  });

  it('marks each missing required field with its message', () => {
    expect(
      issuesOf({ entry_date: '', warehouse_id: '', location: '' }),
    ).toEqual([
      ['entry_date', REQUIRED_FIELD_MESSAGE],
      ['warehouse_id', WAREHOUSE_REQUIRED_MESSAGE],
    ]);
  });

  it('does not ask for the location, and refuses one that is too long', () => {
    const base = { entry_date: '2026-10-31', warehouse_id: 'w1' };

    expect(issuesOf({ ...base, location: '   ' })).toBeUndefined();
    expect(issuesOf({ ...base, location: 'x'.repeat(61) })).toEqual([
      ['location', 'Máximo 60 caracteres.'],
    ]);
  });

  it('rejects a future date or one before the classification', () => {
    const base = { warehouse_id: 'w1', location: 'Estante 3' };
    expect(issuesOf({ ...base, entry_date: '2026-11-01' })).toEqual([
      ['entry_date', DATE_IN_FUTURE_MESSAGE],
    ]);
    expect(issuesOf({ ...base, entry_date: '2026-10-28' })).toEqual([
      ['entry_date', ENTRY_BEFORE_CLASSIFICATION_MESSAGE],
    ]);
  });
});

describe('entryFormOf', () => {
  it('starts today, with the only warehouse chosen', () => {
    expect(
      entryFormOf({ entry: null, today: '2026-10-31', onlyWarehouseId: 'w1' }),
    ).toEqual({ entry_date: '2026-10-31', warehouse_id: 'w1', location: '' });
  });

  it('starts with what the entry has, to correct it', () => {
    expect(
      entryFormOf({
        entry: buildStockEntry(),
        today: '2026-10-31',
        onlyWarehouseId: null,
      }),
    ).toEqual({
      entry_date: '2026-10-30',
      warehouse_id: 'w1',
      location: 'Estante 3',
    });
  });
});

describe('toEntryRequest', () => {
  it('sends the lot version and no kilos', () => {
    expect(
      toEntryRequest(
        {
          entry_date: '2026-10-30',
          warehouse_id: 'w1',
          location: ' Estante 3 ',
        },
        buildLotStock(),
      ),
    ).toEqual({
      expected_lot_version: 10,
      entry_date: '2026-10-30',
      warehouse_id: 'w1',
      location: 'Estante 3',
    });
  });
});

describe('toEntryCorrection', () => {
  const entry = buildStockEntry({ version: 2 });

  it('sends only what changed, with the version of the entry', () => {
    expect(
      toEntryCorrection(
        { entry_date: '2026-10-30', warehouse_id: 'w1', location: 'Estante 5' },
        entry,
      ),
    ).toEqual({ expected_version: 2, location: 'Estante 5' });
  });

  it('sends nothing when nothing changed', () => {
    expect(
      toEntryCorrection(
        {
          entry_date: '2026-10-30',
          warehouse_id: 'w1',
          location: ' Estante 3 ',
        },
        entry,
      ),
    ).toBeNull();
  });
});
