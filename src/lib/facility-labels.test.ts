import { Box, Flame, Sun, Warehouse } from 'lucide-react';
import { describe, expect, it } from 'vitest';

import { TONE_ICONS } from '@/components/status-badge';

import {
  agreeWith,
  FACILITY_STATUS_ORDER,
  FACILITY_TYPE_ORDER,
  FACILITY_TYPES,
  facilityName,
  facilityStatus,
} from './facility-labels';

describe('facility types', () => {
  it('lists boxes before dryers', () => {
    expect(FACILITY_TYPE_ORDER).toEqual(['fermentation_box', 'solar_dryer']);
  });

  it('names a fermentation box', () => {
    expect(FACILITY_TYPES.fermentation_box).toMatchObject({
      label: 'Cajón',
      purpose: 'Cajón para fermentar',
      noun: 'cajón',
      article: 'el',
      processes: 'fermentaciones',
      feminine: false,
      Icon: Box,
    });
  });

  it('names a solar dryer', () => {
    expect(FACILITY_TYPES.solar_dryer).toMatchObject({
      label: 'Marquesina',
      purpose: 'Marquesina para secar',
      noun: 'marquesina',
      article: 'la',
      processes: 'secados',
      feminine: true,
      Icon: Warehouse,
    });
  });

  it('agrees a word with the type, masculine without one', () => {
    expect(agreeWith('fermentation_box', 'ocupad')).toBe('ocupado');
    expect(agreeWith('solar_dryer', 'ocupad')).toBe('ocupada');
    expect(agreeWith(undefined, 'inactiv')).toBe('inactivo');
  });

  it('writes a facility with its type, as confirmations and notices name it', () => {
    expect(facilityName('fermentation_box', 'C-01')).toBe('el cajón C-01');
    expect(facilityName('solar_dryer', 'M-02')).toBe('la marquesina M-02');
  });
});

describe('facility statuses', () => {
  it('follows the order of the status filter', () => {
    expect(FACILITY_STATUS_ORDER).toEqual([
      'available',
      'occupied',
      'inactive',
    ]);
  });

  it('shows an available facility as success, whatever its type', () => {
    for (const type of FACILITY_TYPE_ORDER) {
      expect(facilityStatus('available', type)).toEqual({
        label: 'Disponible',
        tone: 'ok',
        Icon: TONE_ICONS.ok,
      });
    }
  });

  it('agrees an occupied facility with its type and shows its process', () => {
    expect(facilityStatus('occupied', 'fermentation_box')).toEqual({
      label: 'Ocupado',
      tone: 'info',
      Icon: Flame,
    });
    expect(facilityStatus('occupied', 'solar_dryer')).toEqual({
      label: 'Ocupada',
      tone: 'info',
      Icon: Sun,
    });
  });

  it('agrees an inactive facility with its type as a warning', () => {
    expect(facilityStatus('inactive', 'fermentation_box')).toEqual({
      label: 'Inactivo',
      tone: 'warn',
      Icon: TONE_ICONS.warn,
    });
    expect(facilityStatus('inactive', 'solar_dryer').label).toBe('Inactiva');
  });

  it('uses the masculine label when no type is given, as filters do', () => {
    expect(FACILITY_STATUS_ORDER.map((s) => facilityStatus(s).label)).toEqual([
      'Disponible',
      'Ocupado',
      'Inactivo',
    ]);
  });
});
