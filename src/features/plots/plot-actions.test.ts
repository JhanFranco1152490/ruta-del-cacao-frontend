import { describe, expect, it } from 'vitest';

import type { KnownPlot } from './known-plots';
import { plotActions } from './plot-actions';
import { PLOT_DELETED_CODE } from './sync-adapter';

const everything = { canAdd: true, canChange: true, canDelete: true };
const serverPlot: KnownPlot = {
  id: 'p1',
  code: 'P01',
  name: null,
  areaHectares: '1.0',
  isActive: true,
  vertices: [],
  version: 3,
};

describe('plotActions', () => {
  it('offers editing in the menu and the online actions for a plot on the server', () => {
    const actions = plotActions(serverPlot, true, everything, false);

    expect(actions).toMatchObject({
      editLabel: 'Editar',
      editVisible: false,
      editInMenu: true,
      discard: false,
      toggleStatus: true,
      remove: true,
    });
    expect(actions.serverPlot?.version).toBe(3);
  });

  it('keeps a failed plot on the device to correct in sight, or to discard', () => {
    const failed: KnownPlot = {
      ...serverPlot,
      version: undefined,
      queue: { status: 'error', operation: 'create' },
    };

    expect(plotActions(failed, true, everything, false)).toMatchObject({
      editLabel: 'Corregir',
      editVisible: true,
      editInMenu: false,
      discard: true,
      toggleStatus: false,
      remove: false,
      serverPlot: null,
    });
    expect(plotActions(failed, true, everything, true)).toMatchObject({
      editVisible: false,
      editInMenu: true,
    });
  });

  it('only discards a plot the server no longer has', () => {
    const gone: KnownPlot = {
      ...serverPlot,
      queue: {
        status: 'error',
        operation: 'update',
        errorCode: PLOT_DELETED_CODE,
      },
    };

    expect(plotActions(gone, true, everything, false)).toMatchObject({
      editVisible: false,
      editInMenu: false,
      discard: true,
    });
  });

  it('corrects a new plot with the permission to register and an existing one with the one to edit', () => {
    const pendingNew: KnownPlot = {
      ...serverPlot,
      queue: { status: 'pending', operation: 'create' },
    };
    const onlyAdd = { canAdd: true, canChange: false, canDelete: false };

    expect(plotActions(pendingNew, true, onlyAdd, false).editVisible).toBe(
      true,
    );
    expect(plotActions(serverPlot, true, onlyAdd, false).editInMenu).toBe(
      false,
    );
  });

  it('freezes the plots of an inactive farm', () => {
    expect(plotActions(serverPlot, false, everything, false)).toMatchObject({
      editInMenu: false,
      toggleStatus: false,
      remove: false,
    });
  });
});
