import { describe, expect, it } from 'vitest';

import { formatGeoPoint, parseCoordinates } from './coordinates';

describe('formatGeoPoint', () => {
  it('rounds to the seven decimals the API stores', () => {
    expect(
      formatGeoPoint({ latitude: 7.823456789123, longitude: -72.51 }),
    ).toEqual({ latitude: '7.8234568', longitude: '-72.5100000' });
  });
});

describe('parseCoordinates', () => {
  it('reads typed coordinates, including a decimal comma', () => {
    expect(
      parseCoordinates({ latitude: ' 7,8234567 ', longitude: '-72.5123456' }),
    ).toEqual({ latitude: 7.8234567, longitude: -72.5123456 });
  });

  it.each([
    { latitude: '', longitude: '-72.5' },
    { latitude: '7.', longitude: '-72.5' },
    { latitude: '-', longitude: '-72.5' },
    { latitude: '90.1', longitude: '-72.5' },
    { latitude: '7.8', longitude: '-180.1' },
  ])('has no point for $latitude, $longitude', (coordinates) => {
    expect(parseCoordinates(coordinates)).toBeNull();
  });
});
