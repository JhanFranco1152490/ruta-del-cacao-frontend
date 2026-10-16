import { describe, expect, it } from 'vitest';

import { buildAgriculturalActivity } from '@/test/factories';

import type { QueuedCompletion } from './completion-queue';
import {
  type CatalogInput,
  completionLabel,
  emptyCompletionForm,
  inputChoices,
  queuedToFormInput,
} from './completion-values';

const input = (overrides: Partial<CatalogInput>): CatalogInput => ({
  id: 'in1',
  name: 'Urea 46 %',
  unit: 'kg',
  package_type: 'sack',
  package_size: '50.000',
  is_active: true,
  ...overrides,
});

const catalog = [
  input({ id: 'urea', name: 'Urea 46 %' }),
  input({ id: 'copper', name: 'Óxido de cobre' }),
  input({ id: 'old', name: 'Cal agrícola', is_active: false }),
];

const queued = (
  overrides: Partial<QueuedCompletion> = {},
): QueuedCompletion => ({
  activityId: 'a1',
  label: 'Fertilización · P03',
  status: 'error',
  request: {
    done_date: '2026-10-19',
    inputs: [
      { input_id: 'urea', quantity: '100' },
      { input_id: 'copper', quantity: '2.5' },
    ],
  },
  ...overrides,
});

describe('completionLabel', () => {
  it('names the labor and its plot', () => {
    expect(completionLabel(buildAgriculturalActivity())).toBe(
      'Fertilización · P03',
    );
    expect(
      completionLabel(
        buildAgriculturalActivity({
          activity_type: 'other',
          other_description: 'Resiembra',
        }),
      ),
    ).toBe('Resiembra · P03');
  });
});

describe('emptyCompletionForm', () => {
  it('starts today and without inputs', () => {
    expect(emptyCompletionForm('2026-10-22')).toEqual({
      done_date: '2026-10-22',
      inputs: [],
    });
  });
});

describe('queuedToFormInput', () => {
  const available = new Set(['urea', 'copper']);

  it('opens with what was captured', () => {
    expect(queuedToFormInput(queued(), available)).toEqual({
      values: {
        done_date: '2026-10-19',
        inputs: [
          { input_id: 'urea', quantity: '100' },
          { input_id: 'copper', quantity: '2.5' },
        ],
      },
      unavailableRows: [],
    });
  });

  it('asks to choose again the input that the server rejected, keeping its quantity', () => {
    expect(
      queuedToFormInput(
        queued({
          errorCode: 'input_inactive',
          errorData: { input_ids: ['copper'] },
        }),
        available,
      ),
    ).toEqual({
      values: {
        done_date: '2026-10-19',
        inputs: [
          { input_id: 'urea', quantity: '100' },
          { input_id: '', quantity: '2.5' },
        ],
      },
      unavailableRows: [1],
    });
  });

  it('asks to choose again an input that is no longer among the active ones', () => {
    expect(
      queuedToFormInput(queued(), new Set(['copper'])).unavailableRows,
    ).toEqual([0]);
  });

  it('opens a completion without inputs', () => {
    expect(
      queuedToFormInput(
        queued({ request: { done_date: '2026-10-19' } }),
        available,
      ).values,
    ).toEqual({ done_date: '2026-10-19', inputs: [] });
  });
});

describe('inputChoices', () => {
  const none = new Set<string>();
  const labels = (options: Parameters<typeof inputChoices>[1]) =>
    inputChoices(catalog, options).map(({ label }) => label);

  it('offers only the active inputs', () => {
    expect(labels({ search: '', selectedId: '', takenIds: none })).toEqual([
      'Urea 46 %',
      'Óxido de cobre',
    ]);
  });

  it('searches without accents, capitals or spaces, like the catalog', () => {
    expect(
      labels({ search: 'oxido  DE', selectedId: '', takenIds: none }),
    ).toEqual(['Óxido de cobre']);
    expect(labels({ search: 'zzz', selectedId: '', takenIds: none })).toEqual(
      [],
    );
  });

  it('keeps the chosen input even when it does not match the search', () => {
    expect(
      labels({ search: 'cobre', selectedId: 'urea', takenIds: none }),
    ).toEqual(['Urea 46 %', 'Óxido de cobre']);
  });

  it('shows an input of another row as already in the list, without letting it be chosen twice', () => {
    expect(
      inputChoices(catalog, {
        search: '',
        selectedId: 'copper',
        takenIds: new Set(['urea', 'copper']),
      }),
    ).toEqual([
      { id: 'urea', label: 'Urea 46 % · Ya en la lista', disabled: true },
      { id: 'copper', label: 'Óxido de cobre', disabled: false },
    ]);
  });
});
