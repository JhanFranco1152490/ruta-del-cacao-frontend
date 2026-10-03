import { describe, expect, it } from 'vitest';

import { farmDetailPath, farmEditPath } from './farm-paths';

describe('farmEditPath', () => {
  it('passes the farm id as a parameter of the fixed edit route', () => {
    expect(farmEditPath('f 1')).toBe('/fincas/editar?id=f+1');
  });
});

describe('farmDetailPath', () => {
  it('passes the farm id as a parameter of the fixed detail route', () => {
    expect(farmDetailPath('f 1')).toBe('/fincas/detalle?id=f+1');
  });
});
