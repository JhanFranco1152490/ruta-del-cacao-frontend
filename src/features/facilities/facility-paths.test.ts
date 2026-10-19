import { describe, expect, it } from 'vitest';

import { chooseFarmHref, FACILITIES_PATH } from './facility-paths';

describe('chooseFarmHref', () => {
  it('goes back to choosing the farm', () => {
    expect(chooseFarmHref({ type: 'all', status: 'all' }, null)).toBe(
      `${FACILITIES_PATH}?elegir=1`,
    );
  });

  it('keeps the filters and the producer, to compare the same in another farm', () => {
    expect(
      chooseFarmHref({ type: 'solar_dryer', status: 'inactive' }, 'p7'),
    ).toBe(
      `${FACILITIES_PATH}?productor=p7&tipo=solar_dryer&estado=inactive&elegir=1`,
    );
  });
});
