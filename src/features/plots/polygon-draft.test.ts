import { describe, expect, it } from 'vitest';

import { MAX_VERTICES } from '@/lib/geo/polygon';

import {
  applySuggestion,
  initialDraft,
  polygonDraftReducer as reduce,
} from './polygon-draft';
import type { DraftVertex } from './plot-vertices';

const vertex = (
  latitude: number,
  longitude: number,
  over: Partial<DraftVertex> = {},
): DraftVertex => ({
  latitude,
  longitude,
  source: 'map',
  accuracyM: null,
  capturedAt: null,
  ...over,
});

describe('polygonDraftReducer', () => {
  it('adds vertices in order', () => {
    const state = reduce(
      reduce(initialDraft(), { type: 'add', vertex: vertex(1, 1) }),
      { type: 'add', vertex: vertex(2, 2) },
    );

    expect(state.vertices.map((v) => v.latitude)).toEqual([1, 2]);
  });

  it('does not go past the maximum number of vertices', () => {
    const full = initialDraft(
      Array.from({ length: MAX_VERTICES }, (_, i) => vertex(i, i)),
    );

    expect(reduce(full, { type: 'add', vertex: vertex(0, 0) })).toBe(full);
  });

  it('moves a vertex and no longer treats it as a GPS reading', () => {
    const state = reduce(
      initialDraft([vertex(1, 1, { source: 'gps', accuracyM: 4 })]),
      { type: 'move', index: 0, point: { latitude: 5, longitude: 6 } },
    );

    expect(state.vertices[0]).toMatchObject({
      latitude: 5,
      longitude: 6,
      source: 'map',
      accuracyM: null,
    });
  });

  it('keeps an adjusted vertex as adjusted when it is moved', () => {
    const state = reduce(initialDraft([vertex(1, 1, { source: 'adjusted' })]), {
      type: 'move',
      index: 0,
      point: { latitude: 2, longitude: 2 },
    });

    expect(state.vertices[0].source).toBe('adjusted');
  });

  it('removes the vertex asked for and undoes the last one', () => {
    const base = initialDraft([vertex(1, 1), vertex(2, 2), vertex(3, 3)]);

    expect(
      reduce(base, { type: 'remove', index: 1 }).vertices.map(
        (v) => v.latitude,
      ),
    ).toEqual([1, 3]);
    expect(
      reduce(base, { type: 'undo' }).vertices.map((v) => v.latitude),
    ).toEqual([1, 2]);
    expect(reduce(initialDraft(), { type: 'undo' }).vertices).toEqual([]);
  });

  it('starts and closes the drawing mode without touching the vertices', () => {
    const base = initialDraft([vertex(1, 1)]);
    const drawing = reduce(base, { type: 'startDrawing' });

    expect(drawing).toMatchObject({ drawing: true, vertices: base.vertices });
    expect(reduce(drawing, { type: 'close' }).drawing).toBe(false);
  });

  it('replaces the vertices and leaves the drawing mode', () => {
    const state = reduce(
      { vertices: [vertex(1, 1)], drawing: true },
      { type: 'replace', vertices: [vertex(9, 9)] },
    );

    expect(state).toEqual({ vertices: [vertex(9, 9)], drawing: false });
  });
});

describe('applySuggestion', () => {
  it('keeps the origin of the vertices that were already there and marks the new ones', () => {
    const gps = vertex(1, 1, { source: 'gps', accuracyM: 4, capturedAt: 't0' });

    const result = applySuggestion(
      [gps, vertex(2, 2)],
      [
        { point: { latitude: 1, longitude: 1 }, isAdjusted: false },
        { point: { latitude: 3, longitude: 3 }, isAdjusted: true },
      ],
      't1',
    );

    expect(result[0]).toBe(gps);
    expect(result[1]).toEqual({
      latitude: 3,
      longitude: 3,
      source: 'adjusted',
      accuracyM: null,
      capturedAt: 't1',
    });
  });
});
