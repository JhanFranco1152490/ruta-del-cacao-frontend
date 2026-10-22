import { describe, expect, it } from 'vitest';

import type { PlotCharacterization } from './api';
import {
  characterizationBase,
  characterizationBlockedMessage,
  NO_CATALOG_MESSAGE,
} from './characterization-base';
import type { QueuedCharacterization } from './characterization-queue';

const onServer = { version: 4 } as PlotCharacterization;
const queued = (overrides: Partial<QueuedCharacterization> = {}) =>
  ({ expectedVersion: 2, ...overrides }) as QueuedCharacterization;

describe('characterizationBase', () => {
  it('saves against the record read from the server', () => {
    expect(characterizationBase(undefined, onServer)).toEqual({
      current: undefined,
      expectedVersion: 4,
      serverCharacterization: onServer,
    });
  });

  it('keeps the version a pending record had when it was saved on the device', () => {
    expect(characterizationBase(queued(), onServer).expectedVersion).toBe(2);
  });

  it('saves against the current record a version conflict brought', () => {
    const current = { version: 7 } as PlotCharacterization;
    const conflict = queued({
      errorCode: 'stale_version',
      errorData: { current },
    });

    expect(characterizationBase(conflict, onServer)).toEqual({
      current,
      expectedVersion: 7,
      serverCharacterization: current,
    });
  });

  it('starts over when the conflict says the plot no longer has a record', () => {
    const gone = queued({ errorCode: 'stale_version', errorData: {} });

    expect(characterizationBase(gone, onServer)).toMatchObject({
      current: null,
      expectedVersion: null,
    });
  });
});

describe('characterizationBlockedMessage', () => {
  const open = {
    farmActive: true,
    plotActive: true,
    hasCatalog: true,
    syncBlocked: null,
  };

  it('lets the record be edited when nothing stops it', () => {
    expect(characterizationBlockedMessage(open)).toBe(null);
  });

  it('says first the farm, then the plot, then the missing catalog', () => {
    expect(
      characterizationBlockedMessage({
        ...open,
        farmActive: false,
        plotActive: false,
      }),
    ).toMatch(/La finca está inactiva/);
    expect(
      characterizationBlockedMessage({ ...open, plotActive: false }),
    ).toMatch(/La parcela está inactiva/);
    expect(characterizationBlockedMessage({ ...open, hasCatalog: false })).toBe(
      NO_CATALOG_MESSAGE,
    );
  });
});
