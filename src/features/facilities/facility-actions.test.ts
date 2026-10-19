import { describe, expect, it } from 'vitest';

import { buildFacility } from '@/test/factories';

import { facilityActions, type FacilityPermissions } from './facility-actions';

const all: FacilityPermissions = {
  canChange: true,
  canDelete: true,
  canViewLots: true,
};
const none: FacilityPermissions = {
  canChange: false,
  canDelete: false,
  canViewLots: false,
};

const occupied = (facility_type: 'fermentation_box' | 'solar_dryer') =>
  buildFacility({
    facility_type,
    status: 'occupied',
    has_records: true,
    occupied_by: {
      lot: { id: 'l1', code: '000123-F02-P05-261014-1', status: 'fermenting' },
      since: '2026-10-19T12:30:00Z',
    },
  });

const kinds = (actions: { kind: string }[]) => actions.map((a) => a.kind);

describe('facilityActions', () => {
  it('offers editing, deactivating and deleting a facility never used', () => {
    expect(kinds(facilityActions(buildFacility(), all))).toEqual([
      'edit',
      'deactivate',
      'delete',
    ]);
  });

  it('does not offer deleting a facility with records', () => {
    expect(
      kinds(facilityActions(buildFacility({ has_records: true }), all)),
    ).toEqual(['edit', 'deactivate']);
  });

  it('offers activating an inactive facility', () => {
    const inactive = buildFacility({ is_active: false, status: 'inactive' });
    expect(kinds(facilityActions(inactive, all))).toEqual([
      'edit',
      'activate',
      'delete',
    ]);
  });

  it('shows deactivating an occupied facility disabled, with its lot', () => {
    const actions = facilityActions(occupied('fermentation_box'), all);
    expect(kinds(actions)).toEqual(['edit', 'deactivate', 'view-lot']);
    expect(actions[1]).toEqual({
      kind: 'deactivate',
      disabledReason: 'Está ocupado por 000123-F02-P05-261014-1',
    });
  });

  it('agrees the reason with the type', () => {
    const [, deactivate] = facilityActions(occupied('solar_dryer'), all);
    expect(deactivate.disabledReason).toBe(
      'Está ocupada por 000123-F02-P05-261014-1',
    );
  });

  it('does not offer deleting an occupied facility, even never used', () => {
    const lotOnly = { ...occupied('fermentation_box'), has_records: false };
    expect(kinds(facilityActions(lotOnly, all))).not.toContain('delete');
  });

  it('offers the lot only to whoever can see lots', () => {
    expect(
      kinds(
        facilityActions(occupied('fermentation_box'), {
          ...all,
          canViewLots: false,
        }),
      ),
    ).toEqual(['edit', 'deactivate']);
  });

  it('offers only what the permissions allow', () => {
    expect(facilityActions(buildFacility(), none)).toEqual([]);
    expect(
      kinds(facilityActions(buildFacility(), { ...none, canDelete: true })),
    ).toEqual(['delete']);
  });
});
