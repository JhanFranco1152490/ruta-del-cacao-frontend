import type { components } from '@/lib/api/schema';
import { COORDINATE_DECIMALS } from '@/lib/format/coordinates';
import type { GeoPoint } from '@/types/geo';

import type { ApiVertex } from './api';

type VertexInput = components['schemas']['VertexInputRequest'];

export type VertexSource = VertexInput['source'];

// Un vértice del polígono mientras se dibuja: números para operar con ellos, y de dónde salió.
// `accuracyM` solo existe si lo capturó el GPS.
export type DraftVertex = {
  latitude: number;
  longitude: number;
  source: VertexSource;
  accuracyM: number | null;
  capturedAt: string | null;
};

export const toPoints = (vertices: readonly DraftVertex[]): GeoPoint[] =>
  vertices.map(({ latitude, longitude }) => ({ latitude, longitude }));

const ACCURACY_DECIMALS = 1;

// Lo que viaja a la API: las coordenadas como decimales en texto con siete decimales, que es la
// precisión que guarda el servidor (más decimales los rechazaría o los redondearía distinto).
export const toApiBoundary = (
  vertices: readonly DraftVertex[],
): VertexInput[] =>
  vertices.map((vertex) => ({
    latitude: vertex.latitude.toFixed(COORDINATE_DECIMALS),
    longitude: vertex.longitude.toFixed(COORDINATE_DECIMALS),
    // La precisión solo aplica a un vértice del GPS: el servidor rechaza una en otro origen.
    accuracy_m:
      vertex.source === 'gps' && vertex.accuracyM !== null
        ? vertex.accuracyM.toFixed(ACCURACY_DECIMALS)
        : null,
    captured_at: vertex.capturedAt,
    source: vertex.source,
  }));

export const fromApiBoundary = (
  boundary: readonly (ApiVertex | VertexInput)[] | null | undefined,
): DraftVertex[] =>
  (boundary ?? []).map((vertex) => ({
    latitude: Number(vertex.latitude),
    longitude: Number(vertex.longitude),
    source: vertex.source,
    accuracyM:
      vertex.accuracy_m === null || vertex.accuracy_m === undefined
        ? null
        : Number(vertex.accuracy_m),
    capturedAt: vertex.captured_at ?? null,
  }));
