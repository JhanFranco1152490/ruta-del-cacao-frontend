import { describe, expect, it } from 'vitest';

import { ApiError } from '@/lib/api/errors';
import { buildFacility } from '@/test/factories';

import {
  currentFacilityOf,
  duplicateFacilityOf,
  occupyingLotOf,
} from './facility-errors';

const apiError = (
  status: number,
  body: { code: string } & Record<string, unknown>,
) => new ApiError(status, { detail: 'Error de prueba.', fields: {}, ...body });

describe('facility errors', () => {
  it('reads the facility that already has the name', () => {
    const existing = {
      id: 'fc9',
      name: 'C-02',
      facility_type: 'fermentation_box',
      is_active: false,
    };
    expect(
      duplicateFacilityOf(
        apiError(409, { code: 'duplicate_facility_name', existing }),
      ),
    ).toEqual(existing);
    expect(
      duplicateFacilityOf(apiError(409, { code: 'stale_version', existing })),
    ).toBeNull();
    expect(duplicateFacilityOf(new Error('red'))).toBeNull();
  });

  it('reads the facility as it is now when someone changed it first', () => {
    const current = buildFacility({ version: 4 });
    expect(
      currentFacilityOf(apiError(409, { code: 'stale_version', current })),
    ).toEqual(current);
    expect(
      currentFacilityOf(
        apiError(409, { code: 'duplicate_facility_name', current }),
      ),
    ).toBeNull();
  });

  it('reads the lot that occupies the facility', () => {
    const lot = {
      id: 'l1',
      code: '000123-F02-P05-261014-1',
      status: 'fermenting',
    };
    expect(
      occupyingLotOf(apiError(409, { code: 'facility_occupied', lot })),
    ).toEqual(lot);
    expect(
      occupyingLotOf(apiError(409, { code: 'facility_has_records', lot })),
    ).toBeNull();
  });
});
