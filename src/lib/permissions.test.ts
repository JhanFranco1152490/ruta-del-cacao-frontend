import { describe, expect, it } from 'vitest';

import {
  PERMISSIONS,
  hasAnyPermission,
  hasPermission,
  isFieldPermission,
} from './permissions';

describe('hasPermission', () => {
  it('is true when the user has the permission', () => {
    const user = { permissions: [PERMISSIONS.PRODUCERS_VIEW] };

    expect(hasPermission(user, PERMISSIONS.PRODUCERS_VIEW)).toBe(true);
  });

  it('is false when the user lacks the permission', () => {
    const user = { permissions: ['accounts.users_view'] };

    expect(hasPermission(user, PERMISSIONS.PRODUCERS_VIEW)).toBe(false);
  });

  it('is false while the session is not loaded', () => {
    expect(hasPermission(undefined, PERMISSIONS.PRODUCERS_VIEW)).toBe(false);
    expect(hasPermission(null, PERMISSIONS.PRODUCERS_VIEW)).toBe(false);
  });

  it('is false when the session carries no permission list', () => {
    expect(hasPermission({}, PERMISSIONS.PRODUCERS_VIEW)).toBe(false);
  });
});

describe('hasAnyPermission', () => {
  const user = { permissions: [PERMISSIONS.INDICATORS_VIEW_ASSOCIATION] };

  it('is true when the user has one of them', () => {
    expect(
      hasAnyPermission(user, [
        PERMISSIONS.INDICATORS_VIEW_PRODUCER,
        PERMISSIONS.INDICATORS_VIEW_ASSOCIATION,
      ]),
    ).toBe(true);
  });

  it('is false when the user has none, or no session', () => {
    expect(hasAnyPermission(user, [PERMISSIONS.INDICATORS_VIEW_PRODUCER])).toBe(
      false,
    );
    expect(
      hasAnyPermission(undefined, PERMISSIONS.INDICATORS_VIEW_PRODUCER),
    ).toBe(false);
  });
});

describe('isFieldPermission', () => {
  it('counts what hangs from a farm, harvests, lots, fermentation and facilities included', () => {
    expect(isFieldPermission(PERMISSIONS.FARMS_VIEW)).toBe(true);
    expect(isFieldPermission(PERMISSIONS.ACTIVITIES_COMPLETE)).toBe(true);
    expect(isFieldPermission(PERMISSIONS.CROPS_CHARACTERIZE)).toBe(true);
    expect(isFieldPermission(PERMISSIONS.HARVESTS_ADD)).toBe(true);
    expect(isFieldPermission(PERMISSIONS.LOTS_VIEW)).toBe(true);
    expect(isFieldPermission(PERMISSIONS.FERMENTATION_LOG_TURNS)).toBe(true);
    expect(isFieldPermission(PERMISSIONS.FERMENTATION_MANAGE)).toBe(true);
    expect(isFieldPermission(PERMISSIONS.DRYING_LOG)).toBe(true);
    expect(isFieldPermission(PERMISSIONS.QUALITY_EVALUATE)).toBe(true);
    expect(isFieldPermission(PERMISSIONS.QUALITY_DISCARD)).toBe(true);
    expect(isFieldPermission(PERMISSIONS.WAREHOUSE_VIEW_STOCK)).toBe(true);
    expect(isFieldPermission(PERMISSIONS.WAREHOUSE_MANAGE)).toBe(true);
    expect(isFieldPermission(PERMISSIONS.DRYING_MANAGE)).toBe(true);
    expect(isFieldPermission(PERMISSIONS.FACILITIES_VIEW)).toBe(true);
    expect(isFieldPermission(PERMISSIONS.FACILITIES_DELETE)).toBe(true);
  });

  // Los catálogos son de toda la asociación: quien los administra no necesita una finca.
  it('leaves out the association catalogs and the accounts', () => {
    expect(isFieldPermission(PERMISSIONS.CROPS_MANAGE_VARIETIES)).toBe(false);
    expect(isFieldPermission(PERMISSIONS.HEALTH_MANAGE_PEST_DISEASE)).toBe(
      false,
    );
    expect(isFieldPermission(PERMISSIONS.USERS_VIEW)).toBe(false);
  });

  // El del productor cuelga de sus fincas; el de la asociación consolida las de todos y sus
  // cuentas no llevan finca: de lo contrario el administrador vería el aviso de «sin finca».
  it('counts the producer indicators but not the association ones', () => {
    expect(isFieldPermission(PERMISSIONS.INDICATORS_VIEW_PRODUCER)).toBe(true);
    expect(isFieldPermission(PERMISSIONS.INDICATORS_VIEW_ASSOCIATION)).toBe(
      false,
    );
  });

  // Igual que los indicadores: el reporte del productor es de sus fincas y el de la asociación,
  // de todas.
  it('counts the producer reports but not the association ones', () => {
    expect(isFieldPermission(PERMISSIONS.REPORTS_VIEW_PRODUCER)).toBe(true);
    expect(isFieldPermission(PERMISSIONS.REPORTS_VIEW_ASSOCIATION)).toBe(false);
  });

  // Un comprador le compra al productor, no a una finca.
  it('leaves out the buyers, which belong to the whole producer', () => {
    expect(isFieldPermission(PERMISSIONS.BUYERS_VIEW)).toBe(false);
    expect(isFieldPermission(PERMISSIONS.BUYERS_DELETE)).toBe(false);
  });

  // Una venta saca el cacao de una finca: quien vende necesita una.
  it('counts the sales, which belong to one farm', () => {
    expect(isFieldPermission(PERMISSIONS.SALES_VIEW)).toBe(true);
    expect(isFieldPermission(PERMISSIONS.SALES_ADD)).toBe(true);
    expect(isFieldPermission(PERMISSIONS.SALES_VOID)).toBe(true);
  });
});
