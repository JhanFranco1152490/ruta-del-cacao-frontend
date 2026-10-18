import { describe, expect, it } from 'vitest';

import { buildAgriculturalActivity } from '@/test/factories';

import type { QueuedCompletion } from './completion-queue';
import {
  completionLabel,
  emptyCompletionForm,
  queuedToFormInput,
} from './completion-values';

const queued = (
  overrides: Partial<QueuedCompletion> = {},
): QueuedCompletion => ({
  activityId: 'a1',
  label: 'Fertilización · P-03',
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
      'Fertilización · P-03',
    );
    expect(
      completionLabel(
        buildAgriculturalActivity({
          activity_type: 'other',
          other_description: 'Resiembra',
        }),
      ),
    ).toBe('Resiembra · P-03');
  });
});

describe('emptyCompletionForm', () => {
  it('starts today and without inputs', () => {
    expect(emptyCompletionForm('2026-10-22')).toEqual({
      done_date: '2026-10-22',
      inputs: [],
    });
  });

  it('suggests the planned input of a control as its first row, to be changed or removed', () => {
    expect(
      emptyCompletionForm('2026-10-22', {
        id: 'copper',
        is_active: true,
      }),
    ).toEqual({
      done_date: '2026-10-22',
      inputs: [{ input_id: 'copper', quantity: '' }],
    });
  });

  it('suggests nothing when the planned input is no longer active', () => {
    expect(
      emptyCompletionForm('2026-10-22', {
        id: 'copper',
        is_active: false,
      }).inputs,
    ).toEqual([]);
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
