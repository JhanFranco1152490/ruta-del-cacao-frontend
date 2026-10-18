import { describe, expect, it } from 'vitest';

import { buildAgriculturalActivity } from '@/test/factories';

import { toActivityOfDay } from './activity-days';
import { groupActivitiesByPlot } from './activity-plots';

const TODAY = '2026-10-22';

const plotOf = (id: string, code: string, farm: string, farmName: string) => ({
  id,
  code,
  name: null,
  is_active: true,
  farm: { id: farm, code: 'F01', name: farmName, is_active: true },
});

const item = (
  id: string,
  plot: ReturnType<typeof plotOf>,
  scheduled_date: string,
) =>
  toActivityOfDay(
    buildAgriculturalActivity({ id, plot, scheduled_date }),
    TODAY,
  );

describe('groupActivitiesByPlot', () => {
  const norte = plotOf('p1', 'P-01', 'f1', 'Norte');
  const norte2 = plotOf('p2', 'P-02', 'f1', 'Norte');
  const sur = plotOf('p3', 'P-01', 'f2', 'Sur');

  it('groups by farm and plot, sorted by farm name and plot code', () => {
    const farms = groupActivitiesByPlot([
      item('a', sur, '2026-10-05'),
      item('b', norte2, '2026-10-06'),
      item('c', norte, '2026-10-07'),
    ]);

    expect(farms.map(({ farmName }) => farmName)).toEqual(['Norte', 'Sur']);
    expect(farms[0].plots.map(({ plot }) => plot.code)).toEqual([
      'P-01',
      'P-02',
    ]);
  });

  it('keeps the activities of a plot from the earliest to the latest', () => {
    const [farm] = groupActivitiesByPlot([
      item('late', norte, '2026-10-20'),
      item('early', norte, '2026-10-02'),
    ]);

    expect(farm.plots[0].activities.map(({ activity }) => activity.id)).toEqual(
      ['early', 'late'],
    );
  });

  it('only lists the plots that have activities', () => {
    expect(groupActivitiesByPlot([])).toEqual([]);
  });

  it('keeps two farms that have a plot with the same code apart', () => {
    const farms = groupActivitiesByPlot([
      item('a', norte, '2026-10-05'),
      item('b', sur, '2026-10-05'),
    ]);

    expect(farms.map(({ plots }) => plots.length)).toEqual([1, 1]);
  });
});
