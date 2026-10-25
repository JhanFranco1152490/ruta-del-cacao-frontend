import { describe, expect, it } from 'vitest';

import { PARAMETER_KEYS } from './parameter-fields';
import { PARAMETER_SECTIONS, sectionOfKey } from './parameter-rows';

describe('PARAMETER_SECTIONS', () => {
  it('shows each of the 21 values exactly once', () => {
    const shown = PARAMETER_SECTIONS.flatMap(({ rows }) =>
      rows.flatMap(({ fields }) => fields.map(({ key }) => key)),
    );

    expect(shown.toSorted()).toEqual([...PARAMETER_KEYS].toSorted());
  });

  it('says in which card each value is edited', () => {
    expect(sectionOfKey('entry_moisture_min_pct')).toBe('secado');
    expect(sectionOfKey('estimated_days_max')).toBe('secado');
    expect(sectionOfKey('slow_stall_window_hours')).toBe('alertas');
    expect(sectionOfKey('overdried_moisture_pct')).toBe('alertas');
  });
});
