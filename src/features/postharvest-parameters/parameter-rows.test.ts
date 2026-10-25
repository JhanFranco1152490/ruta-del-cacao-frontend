import { describe, expect, it } from 'vitest';

import { PARAMETER_KEYS } from './parameter-fields';
import { PARAMETER_SECTIONS } from './parameter-rows';

describe('PARAMETER_SECTIONS', () => {
  it('shows each of the 15 values exactly once', () => {
    const shown = PARAMETER_SECTIONS.flatMap(({ rows }) =>
      rows.flatMap(({ fields }) => fields.map(({ key }) => key)),
    );

    expect(shown.toSorted()).toEqual([...PARAMETER_KEYS].toSorted());
  });
});
