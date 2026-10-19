import { describe, expect, it } from 'vitest';

import { buildFacility } from '@/test/factories';

import {
  capacityText,
  createFacilityFormSchema,
  facilityFormValuesOf,
  toCreateRequest,
  toUpdateRequest,
} from './facility-form';

const esperanza = {
  id: 'f1',
  code: 'F01',
  name: 'La Esperanza',
  is_active: true,
};
const diviso = { id: 'f2', code: 'F02', name: 'El Diviso', is_active: true };
const known = [
  buildFacility({ id: 'c2', name: 'C-02', farm: esperanza }),
  buildFacility({ id: 'm1', name: 'M-01', farm: diviso }),
];
const farmNames: Record<string, string> = {
  f1: 'La Esperanza',
  f2: 'El Diviso',
};

const schema = (editingId?: string) =>
  createFacilityFormSchema({
    known,
    editingId,
    farmName: (id) => farmNames[id] ?? '',
  });

const valid = {
  facility_type: 'fermentation_box',
  name: 'C-04',
  farm_id: 'f1',
  capacity_kg: '600',
} as const;

const messages = (input: Record<string, string>) => {
  const result = schema().safeParse({ ...valid, ...input });
  return result.success
    ? {}
    : Object.fromEntries(
        result.error.issues.map((issue) => [issue.path[0], issue.message]),
      );
};

describe('the facility form', () => {
  it('accepts a complete facility', () => {
    const result = schema().parse({ ...valid, name: '  C-04 ' });
    expect(result).toEqual({
      facility_type: 'fermentation_box',
      name: 'C-04',
      farm_id: 'f1',
      capacity_kg: '600',
    });
  });

  it('marks each missing field', () => {
    expect(
      messages({ facility_type: '', name: ' ', farm_id: '', capacity_kg: '' }),
    ).toEqual({
      facility_type: 'Campo obligatorio',
      name: 'Campo obligatorio',
      farm_id: 'Campo obligatorio',
      capacity_kg: 'Campo obligatorio',
    });
  });

  it('asks for the type when no card is marked, which the form gives as null', () => {
    const result = schema().safeParse({ ...valid, facility_type: null });
    expect(result.success).toBe(false);
    expect(result.error?.issues.map((issue) => issue.message)).toEqual([
      'Campo obligatorio',
    ]);
  });

  it('takes a capacity with one decimal, written with comma or point', () => {
    expect(schema().parse({ ...valid, capacity_kg: '12,5' }).capacity_kg).toBe(
      '12.5',
    );
    expect(schema().parse({ ...valid, capacity_kg: '12.5' }).capacity_kg).toBe(
      '12.5',
    );
    expect(messages({ capacity_kg: '12,55' })).toEqual({
      capacity_kg: 'Usa máximo 1 decimal.',
    });
    expect(messages({ capacity_kg: 'seiscientos' })).toEqual({
      capacity_kg: 'Escribe la capacidad en kilos.',
    });
  });

  it('asks for a capacity above zero and up to 10.000 kg', () => {
    expect(messages({ capacity_kg: '0' })).toEqual({
      capacity_kg: 'Debe ser mayor que cero',
    });
    expect(messages({ capacity_kg: '-5' })).toEqual({
      capacity_kg: 'Debe ser mayor que cero',
    });
    expect(messages({ capacity_kg: '10001' })).toEqual({
      capacity_kg: 'La capacidad supera 10.000 kg. Revisa la cifra.',
    });
    expect(messages({ capacity_kg: '0,05' })).toEqual({
      capacity_kg: 'Usa máximo 1 decimal.',
    });
    expect(messages({ capacity_kg: '10000' })).toEqual({});
  });

  it('limits the name to 40 characters', () => {
    expect(messages({ name: 'x'.repeat(41) })).toEqual({
      name: 'Máximo 40 caracteres.',
    });
  });

  it('rejects a name already used in the farm, written in another way and of any type', () => {
    expect(messages({ name: 'c 02', facility_type: 'solar_dryer' })).toEqual({
      name: 'Ya existe C-02 en La Esperanza.',
    });
  });

  it('accepts the same name in another farm', () => {
    expect(messages({ name: 'C-02', farm_id: 'f2' })).toEqual({});
  });

  it('does not compare a facility with itself when editing', () => {
    expect(schema('c2').safeParse({ ...valid, name: 'C-02' }).success).toBe(
      true,
    );
  });
});

describe('capacityText', () => {
  it('leaves out the zero decimal and writes the comma', () => {
    expect(capacityText('600.0')).toBe('600 kg');
    expect(capacityText('12.5')).toBe('12,5 kg');
  });
});

describe('the values of the form', () => {
  it('starts a new one in the farm of the list', () => {
    expect(facilityFormValuesOf(undefined, 'f1')).toEqual({
      facility_type: '',
      name: '',
      farm_id: 'f1',
      capacity_kg: '',
    });
  });

  it('starts an edition with the current values', () => {
    expect(
      facilityFormValuesOf(
        buildFacility({ name: 'C-09', capacity_kg: '450.0', farm: diviso }),
        'f1',
      ),
    ).toEqual({
      facility_type: 'fermentation_box',
      name: 'C-09',
      farm_id: 'f2',
      capacity_kg: '450',
    });
  });
});

describe('the requests', () => {
  it('registers with the four fields', () => {
    expect(
      toCreateRequest({
        facility_type: 'solar_dryer',
        name: 'M-03',
        farm_id: 'f2',
        capacity_kg: '300',
      }),
    ).toEqual({
      facility_type: 'solar_dryer',
      name: 'M-03',
      farm_id: 'f2',
      capacity_kg: '300',
    });
  });

  it('edits only what changed, never the farm', () => {
    const facility = buildFacility({ name: 'C-4', capacity_kg: '600.0' });
    expect(
      toUpdateRequest(
        {
          facility_type: 'fermentation_box',
          name: 'C-04',
          farm_id: 'f2',
          capacity_kg: '600',
        },
        facility,
      ),
    ).toEqual({ name: 'C-04' });
  });

  it('says when nothing changed', () => {
    const facility = buildFacility({ name: 'C-01', capacity_kg: '600.0' });
    expect(
      toUpdateRequest(
        {
          facility_type: 'fermentation_box',
          name: 'C-01',
          farm_id: 'f1',
          capacity_kg: '600',
        },
        facility,
      ),
    ).toBeNull();
  });
});
