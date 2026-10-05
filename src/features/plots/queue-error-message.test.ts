import { describe, expect, it } from 'vitest';

import {
  QueueItemBusyError,
  QueueItemHasDependentsError,
} from '@/lib/offline/sync-queue';

import { plotQueueErrorMessage } from './queue-error-message';

describe('plotQueueErrorMessage', () => {
  it('asks to discard the pending characterization first', () => {
    expect(
      plotQueueErrorMessage(new QueueItemHasDependentsError(), 'fallback'),
    ).toBe(
      'Descarta primero su caracterización pendiente: espera a que esta parcela llegue al servidor.',
    );
  });

  it('explains a plot that is being sent', () => {
    expect(plotQueueErrorMessage(new QueueItemBusyError(), 'fallback')).toMatch(
      /se está enviando/,
    );
  });

  it('falls back for anything else', () => {
    expect(plotQueueErrorMessage(new Error('x'), 'fallback')).toBe('fallback');
  });
});
