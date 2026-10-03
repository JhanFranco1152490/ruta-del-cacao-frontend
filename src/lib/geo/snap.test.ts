import { describe, expect, it } from 'vitest';

import { SNAP_DISTANCE_METRES, snapToBorders } from './snap';
import { rect } from './test-shapes';

// Un grado de latitud son unos 111 km: 0,00001° son poco más de un metro.
const METRE = 0.000009;

describe('snapToBorders', () => {
  const neighbour = rect(1, 0, 2, 1);

  it('sticks to a vertex of another plot when it lands near it', () => {
    const [vertex] = neighbour;

    const snapped = snapToBorders(
      {
        latitude: vertex.latitude + METRE,
        longitude: vertex.longitude - METRE,
      },
      [neighbour],
    );

    expect(snapped).toEqual(vertex);
  });

  it('sticks to the border of another plot when it lands near a side', () => {
    const [bottomLeft, bottomRight] = neighbour;
    const midLongitude = (bottomLeft.longitude + bottomRight.longitude) / 2;

    const snapped = snapToBorders(
      { latitude: bottomLeft.latitude - 2 * METRE, longitude: midLongitude },
      [neighbour],
    );

    expect(snapped.latitude).toBeCloseTo(bottomLeft.latitude, 7);
    expect(snapped.longitude).toBeCloseTo(midLongitude, 6);
  });

  it('leaves a point that is farther than the snap distance', () => {
    const [vertex] = neighbour;
    const far = {
      latitude: vertex.latitude - (SNAP_DISTANCE_METRES + 2) * METRE,
      longitude: vertex.longitude,
    };

    expect(snapToBorders(far, [neighbour])).toEqual(far);
  });

  it('leaves the point alone when there is nothing to stick to', () => {
    const point = { latitude: 7.8, longitude: -72.5 };

    expect(snapToBorders(point, [])).toEqual(point);
  });
});
