import { describe, expect, it } from 'vitest';

import { canComplete, canDelete, canEdit } from './activity-state';

describe('actions by state', () => {
  it('edits and deletes only what is scheduled or delayed', () => {
    for (const state of ['scheduled', 'delayed'] as const) {
      expect(canEdit(state)).toBe(true);
      expect(canDelete(state)).toBe(true);
    }
    for (const state of ['overdue', 'done'] as const) {
      expect(canEdit(state)).toBe(false);
      expect(canDelete(state)).toBe(false);
    }
  });

  it('completes anything that is not done yet', () => {
    for (const state of ['scheduled', 'delayed', 'overdue'] as const) {
      expect(canComplete(state, 'fertilization')).toBe(true);
    }
    expect(canComplete('done', 'fertilization')).toBe(false);
  });

  it('never completes a monitoring here: it is recorded with its result', () => {
    expect(canComplete('scheduled', 'phytosanitary_monitoring')).toBe(false);
    expect(canComplete('overdue', 'phytosanitary_monitoring')).toBe(false);
    expect(canComplete('scheduled', 'phytosanitary_control')).toBe(true);
  });
});
