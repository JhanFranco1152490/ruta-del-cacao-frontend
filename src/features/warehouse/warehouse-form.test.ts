import { describe, expect, it } from 'vitest';

import { buildWarehouse } from '@/test/factories';
import { REQUIRED_FIELD_MESSAGE } from '@/lib/validation/messages';

import {
  toWarehouseRequest,
  toWarehouseUpdate,
  warehouseFormOf,
  warehouseFormSchema,
} from './warehouse-form';

const messageOf = (values: { farm_id: string; name: string }) =>
  warehouseFormSchema
    .safeParse(values)
    .error?.issues.map(({ path, message }) => [path[0], message]);

describe('warehouseFormSchema', () => {
  it('asks for the farm and the name', () => {
    expect(messageOf({ farm_id: '', name: '  ' })).toEqual([
      ['farm_id', REQUIRED_FIELD_MESSAGE],
      ['name', REQUIRED_FIELD_MESSAGE],
    ]);
  });

  it('accepts up to 40 characters in the name', () => {
    expect(messageOf({ farm_id: 'f1', name: 'x'.repeat(40) })).toBeUndefined();
    expect(messageOf({ farm_id: 'f1', name: 'x'.repeat(41) })).toEqual([
      ['name', 'Máximo 40 caracteres.'],
    ]);
  });
});

describe('warehouseFormOf', () => {
  it('starts empty on the given farm, or with the warehouse to edit', () => {
    expect(warehouseFormOf(undefined, 'f1')).toEqual({
      farm_id: 'f1',
      name: '',
    });
    expect(warehouseFormOf(buildWarehouse(), '')).toEqual({
      farm_id: 'f1',
      name: 'Bodega principal',
    });
  });
});

describe('toWarehouseRequest', () => {
  it('sends the farm and the trimmed name', () => {
    expect(toWarehouseRequest({ farm_id: 'f1', name: ' Bodega 2 ' })).toEqual({
      farm_id: 'f1',
      name: 'Bodega 2',
    });
  });
});

describe('toWarehouseUpdate', () => {
  it('sends only the new name, with the version read', () => {
    expect(
      toWarehouseUpdate(
        { farm_id: 'f1', name: 'Bodega norte' },
        buildWarehouse({ version: 3 }),
      ),
    ).toEqual({ expected_version: 3, name: 'Bodega norte' });
  });

  it('sends nothing when the name did not change', () => {
    expect(
      toWarehouseUpdate(
        { farm_id: 'f1', name: ' Bodega principal ' },
        buildWarehouse(),
      ),
    ).toBeNull();
  });
});
