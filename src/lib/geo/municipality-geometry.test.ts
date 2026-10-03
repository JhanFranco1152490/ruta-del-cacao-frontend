import { describe, expect, it, vi } from 'vitest';

import {
  createGeometryLoader,
  createMunicipalityGeometry,
  loadMunicipalityGeometry,
  type MunicipalityCollection,
} from './municipality-geometry';
import collection from './norte-de-santander-municipalities.json';
import { boundsContain, OPERATING_AREA_BOUNDS } from './operating-area';

const municipalities = collection as unknown as MunicipalityCollection;
const CUCUTA = { latitude: 7.8939, longitude: -72.5078 };
const OCANA = { latitude: 8.2379, longitude: -73.356 };
const PAMPLONA = { latitude: 7.3756, longitude: -72.648 };
// Dentro del rectángulo del departamento, pero en Venezuela.
const SAN_CRISTOBAL_VE = { latitude: 7.7669, longitude: -72.225 };

describe('municipality geometry', () => {
  it('ships the 40 municipalities of the department', () => {
    const codes = municipalities.features.map(
      (feature) => feature.properties.code,
    );
    expect(new Set(codes).size).toBe(40);
    expect(codes.every((code) => /^54\d{3}$/.test(code))).toBe(true);
  });

  it('keeps every municipality inside the operating area', () => {
    const geometry = createMunicipalityGeometry(municipalities);
    for (const feature of municipalities.features) {
      const bounds = geometry.boundsOf(feature.properties.code)!;
      expect(
        boundsContain(OPERATING_AREA_BOUNDS, {
          latitude: bounds.south,
          longitude: bounds.west,
        }),
      ).toBe(true);
      expect(
        boundsContain(OPERATING_AREA_BOUNDS, {
          latitude: bounds.north,
          longitude: bounds.east,
        }),
      ).toBe(true);
    }
  });

  it('places every label inside its municipality', () => {
    const geometry = createMunicipalityGeometry(municipalities);

    expect(geometry.outlines).toHaveLength(40);
    for (const outline of geometry.outlines) {
      expect(geometry.municipalityAt(outline.labelPoint)).toBe(outline.code);
    }
  });

  it('finds the municipality of known points', async () => {
    const geometry = await loadMunicipalityGeometry();
    expect(geometry.municipalityAt(CUCUTA)).toBe('54001');
    expect(geometry.municipalityAt(OCANA)).toBe('54498');
    expect(geometry.municipalityAt(PAMPLONA)).toBe('54518');
  });

  it('returns null for a point across the border', async () => {
    const geometry = await loadMunicipalityGeometry();
    expect(boundsContain(OPERATING_AREA_BOUNDS, SAN_CRISTOBAL_VE)).toBe(true);
    expect(geometry.municipalityAt(SAN_CRISTOBAL_VE)).toBeNull();
  });

  it('returns the bounds of a municipality around its points', async () => {
    const geometry = await loadMunicipalityGeometry();
    expect(boundsContain(geometry.boundsOf('54001')!, CUCUTA)).toBe(true);
  });

  it('returns null for an unknown code', async () => {
    const geometry = await loadMunicipalityGeometry();
    expect(geometry.boundsOf('05001')).toBeNull();
    expect(geometry.boundsOf('')).toBeNull();
  });
});

describe('createGeometryLoader', () => {
  it('loads the collection only once', async () => {
    const importCollection = vi.fn().mockResolvedValue(municipalities);
    const load = createGeometryLoader(importCollection);
    expect(await load()).toBe(await load());
    expect(importCollection).toHaveBeenCalledTimes(1);
  });

  it('tries again after a failed load', async () => {
    const importCollection = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValue(municipalities);
    const load = createGeometryLoader(importCollection);
    await expect(load()).rejects.toThrow('offline');
    await expect(load()).resolves.toBeDefined();
    expect(importCollection).toHaveBeenCalledTimes(2);
  });
});
