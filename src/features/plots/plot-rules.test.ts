import { describe, expect, it } from 'vitest';

import { rect } from '@/lib/geo/test-shapes';

import { checkPlot, type PlotCheckInput } from './plot-rules';

// rect(0, 0, 1, 1) mide unas 1,2 ha en estas coordenadas.
const PLOT = rect(0, 0, 1, 1);

const base = (over: Partial<PlotCheckInput> = {}): PlotCheckInput => ({
  declaredAreaHectares: 1.2,
  vertices: [],
  farmAreaHectares: 10,
  farmPoint: null,
  otherAllocatedHectares: 0,
  neighbours: [],
  ...over,
});

describe('checkPlot — area available', () => {
  it('says how much is left, without counting the plot being edited', () => {
    expect(
      checkPlot(base({ otherAllocatedHectares: 6 })).availableHectares,
    ).toBe(4);
  });

  it('blocks an area that goes past what is left', () => {
    const check = checkPlot(
      base({ declaredAreaHectares: 5, otherAllocatedHectares: 6 }),
    );

    expect(check.exceedsFarmArea).toBe(true);
  });

  it('accepts exactly what is left', () => {
    const check = checkPlot(
      base({ declaredAreaHectares: 4, otherAllocatedHectares: 6 }),
    );

    expect(check.exceedsFarmArea).toBe(false);
  });

  it('does not add decimals up wrongly', () => {
    const check = checkPlot(
      base({
        farmAreaHectares: 0.3,
        otherAllocatedHectares: 0.1,
        declaredAreaHectares: 0.2,
      }),
    );

    expect(check.exceedsFarmArea).toBe(false);
  });

  it('does not complain while there is no area to compare', () => {
    expect(
      checkPlot(base({ declaredAreaHectares: null })).exceedsFarmArea,
    ).toBe(false);
  });
});

describe('checkPlot — polygon', () => {
  it('has no polygon, problem or measures while there are no vertices', () => {
    const check = checkPlot(base());

    expect(check).toMatchObject({
      hasPolygon: false,
      polygonProblem: null,
      measuredAreaHectares: null,
      perimeterMetres: null,
    });
  });

  it('measures a valid polygon', () => {
    const check = checkPlot(base({ vertices: PLOT }));

    expect(check.polygonProblem).toBeNull();
    expect(check.measuredAreaHectares).toBeGreaterThan(1.1);
    expect(check.perimeterMetres).toBeGreaterThan(400);
  });

  it('reports why a polygon is not valid and does not measure it', () => {
    const [a, b, c, d] = PLOT;
    const check = checkPlot(base({ vertices: [a, c, b, d] }));

    expect(check.polygonProblem).toBe('crossing_sides');
    expect(check.measuredAreaHectares).toBeNull();
  });

  it('is not a problem yet while the person is still drawing the first vertices', () => {
    expect(checkPlot(base({ vertices: PLOT.slice(0, 2) })).polygonProblem).toBe(
      'too_few_vertices',
    );
  });
});

describe('checkPlot — declared against drawn area', () => {
  const measured = checkPlot(base({ vertices: PLOT })).measuredAreaHectares!;

  it('blocks a difference of more than 5 %', () => {
    const check = checkPlot(
      base({
        vertices: PLOT,
        declaredAreaHectares: Number((measured * 1.2).toFixed(2)),
      }),
    );

    expect(check.areaMismatch).toBe(true);
  });

  it('accepts a smaller difference but warns about it', () => {
    const check = checkPlot(
      base({
        vertices: PLOT,
        declaredAreaHectares: Number((measured * 1.03).toFixed(2)),
      }),
    );

    expect(check).toMatchObject({
      areaMismatch: false,
      areaDifferenceNotice: true,
    });
  });

  it('says nothing when both areas agree at two decimals', () => {
    const check = checkPlot(
      base({
        vertices: PLOT,
        declaredAreaHectares: Number(measured.toFixed(2)),
      }),
    );

    expect(check).toMatchObject({
      areaMismatch: false,
      areaDifferenceNotice: false,
    });
  });

  it('has nothing to compare without a polygon', () => {
    expect(checkPlot(base()).areaMismatch).toBe(false);
  });

  it('always accepts the drawn area rounded to two decimals, even on a small plot', () => {
    // Redondear a dos decimales mueve el área hasta 0,005 ha: en una parcela de menos de
    // 0,1 ha eso pasa del 5 %, y la herramienta rechazaría el área que ella misma propone.
    for (let side = 0.1; side <= 0.4; side += 0.005) {
      const vertices = rect(0, 0, side, side);
      const drawn = checkPlot(base({ vertices })).measuredAreaHectares!;
      const check = checkPlot(
        base({ vertices, declaredAreaHectares: Number(drawn.toFixed(2)) }),
      );

      expect(drawn).toBeLessThan(0.2);
      expect(check.areaMismatch).toBe(false);
    }
  });

  it('still blocks a clearly different area on a small plot', () => {
    const vertices = rect(0, 0, 0.25, 0.25);
    const drawn = checkPlot(base({ vertices })).measuredAreaHectares!;

    const check = checkPlot(
      base({ vertices, declaredAreaHectares: Number((drawn * 2).toFixed(2)) }),
    );

    expect(check.areaMismatch).toBe(true);
  });
});

describe('checkPlot — overlap', () => {
  const neighbour = { id: 'p2', code: 'P2', points: rect(1, 0, 2, 1) };

  it('allows a shared side', () => {
    expect(
      checkPlot(base({ vertices: PLOT, neighbours: [neighbour] })).overlaps,
    ).toEqual([]);
  });

  it('names the plot invaded, highlights the zone and suggests an adjustment', () => {
    const check = checkPlot(
      base({
        vertices: rect(0, 0, 2, 1),
        neighbours: [neighbour],
      }),
    );

    expect(check.overlaps).toMatchObject([{ id: 'p2', code: 'P2' }]);
    expect(check.overlapRegions).toHaveLength(1);
    expect(check.suggestion).not.toBeNull();
  });

  it('has no suggestion when the plot is entirely inside another', () => {
    const check = checkPlot(
      base({
        vertices: rect(1, 1, 2, 2),
        neighbours: [{ id: 'p2', code: 'P2', points: rect(0, 0, 3, 3) }],
      }),
    );

    expect(check.overlaps).toHaveLength(1);
    expect(check.suggestion).toBeNull();
  });
});

describe('checkPlot — distance from the farm point', () => {
  const farmPoint = { latitude: 7.8, longitude: -72.5 };
  const nearby = rect(0, 0, 1, 1);
  // Unos 11 km al norte: muy lejos de una finca de 10 ha.
  const faraway = rect(0, 100, 1, 101);

  it('accepts a polygon next to the farm point', () => {
    expect(
      checkPlot(base({ vertices: nearby, farmPoint })).farVertices,
    ).toEqual([]);
  });

  it('reports each vertex that is too far, with the limit for that farm', () => {
    const check = checkPlot(base({ vertices: faraway, farmPoint }));

    expect(check.farVertices.map(({ index }) => index)).toEqual([0, 1, 2, 3]);
    expect(check.maxDistanceFromFarmMetres).toBe(657);
  });

  it('has nothing to measure without the point of the farm', () => {
    expect(checkPlot(base({ vertices: faraway })).farVertices).toEqual([]);
  });
});
