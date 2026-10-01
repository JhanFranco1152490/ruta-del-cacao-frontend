import { describe, expect, it } from 'vitest';

import { departmentCodeOf } from './departments';

describe('departmentCodeOf', () => {
  it('reads the department from the DIVIPOLA municipality code', () => {
    expect(departmentCodeOf('54001')).toBe('54');
  });
});
