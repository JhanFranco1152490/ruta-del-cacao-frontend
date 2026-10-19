import { describe, expect, it } from 'vitest';

import { buildFacility } from '@/test/factories';

import {
  availabilityText,
  breakdownText,
  farmContentsText,
  inProcessText,
  summarizeFacilities,
} from './facility-summary';

const lot = (id: string, code: string) => ({
  lot: { id, code, status: 'fermenting' as const },
  since: '2026-10-19T12:30:00Z',
});

const list = [
  buildFacility({ id: '1', name: 'C-01' }),
  buildFacility({
    id: '2',
    name: 'C-02',
    status: 'occupied',
    occupied_by: lot('l1', '000123-F02-P05-261014-1'),
  }),
  buildFacility({
    id: '3',
    name: 'C-03',
    is_active: false,
    status: 'inactive',
  }),
  buildFacility({ id: '4', name: 'M-01', facility_type: 'solar_dryer' }),
  buildFacility({ id: '5', name: 'M-02', facility_type: 'solar_dryer' }),
  buildFacility({
    id: '6',
    name: 'M-03',
    facility_type: 'solar_dryer',
    status: 'occupied',
    occupied_by: lot('l2', '000123-F02-P01-261012-1'),
  }),
];

describe('summarizeFacilities', () => {
  it('counts each type by status', () => {
    const { byType } = summarizeFacilities(list);
    expect(byType.fermentation_box).toEqual({
      available: 1,
      occupied: 1,
      inactive: 1,
      active: 2,
    });
    expect(byType.solar_dryer).toEqual({
      available: 2,
      occupied: 1,
      inactive: 0,
      active: 3,
    });
  });

  it('lists the lots in process with the facility they occupy', () => {
    expect(summarizeFacilities(list).inProcess).toEqual([
      { lotId: 'l1', lotCode: '000123-F02-P05-261014-1', facility: 'C-02' },
      { lotId: 'l2', lotCode: '000123-F02-P01-261012-1', facility: 'M-03' },
    ]);
  });

  it('counts nothing in an empty list', () => {
    const { byType, inProcess } = summarizeFacilities([]);
    expect(byType.fermentation_box.active).toBe(0);
    expect(inProcess).toEqual([]);
  });
});

describe('summary texts', () => {
  const { byType, inProcess } = summarizeFacilities(list);

  it('says how many of the active ones are available, agreeing with the type', () => {
    expect(availabilityText('fermentation_box', byType.fermentation_box)).toBe(
      '1 de 2 activos',
    );
    expect(availabilityText('solar_dryer', byType.solar_dryer)).toBe(
      '2 de 3 activas',
    );
  });

  it('breaks down the occupied and inactive ones, leaving out the zeros', () => {
    expect(breakdownText('fermentation_box', byType.fermentation_box)).toBe(
      '1 ocupado · 1 inactivo',
    );
    expect(breakdownText('solar_dryer', byType.solar_dryer)).toBe('1 ocupada');
    expect(
      breakdownText('fermentation_box', {
        available: 0,
        active: 2,
        occupied: 2,
        inactive: 0,
      }),
    ).toBe('2 ocupados');
    expect(
      breakdownText('solar_dryer', {
        available: 1,
        active: 1,
        occupied: 0,
        inactive: 0,
      }),
    ).toBe('');
  });

  it('names each lot in process with its facility', () => {
    expect(inProcessText(inProcess)).toBe(
      '000123-F02-P05-261014-1 en C-02 · 000123-F02-P01-261012-1 en M-03',
    );
    expect(inProcessText([])).toBe('Ninguno');
  });
});

describe('farmContentsText', () => {
  it('says what a farm has, with the ones in use', () => {
    expect(farmContentsText(list)).toBe('3 cajones · 3 marquesinas · 2 en uso');
  });

  it('leaves out a type the farm does not have and the zero in use', () => {
    expect(
      farmContentsText([buildFacility({ facility_type: 'solar_dryer' })]),
    ).toBe('1 marquesina');
    expect(farmContentsText([buildFacility()])).toBe('1 cajón');
  });

  it('says when the farm has nothing', () => {
    expect(farmContentsText([])).toBe('Sin cajones ni marquesinas');
  });
});
