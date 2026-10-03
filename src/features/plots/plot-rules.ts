import { type SuggestedVertex, suggestAdjustment } from '@/lib/geo/adjust';
import { polygonAreaHectares } from '@/lib/geo/area';
import {
  findOverlaps,
  type Neighbour,
  overlapRegions,
} from '@/lib/geo/overlap';
import { polygonPerimeterMetres } from '@/lib/geo/perimeter';
import { type PolygonProblem, polygonProblem } from '@/lib/geo/validate';
import type { GeoPoint } from '@/types/geo';

// Diferencia máxima entre el área declarada y la del dibujo, relativa a la del dibujo. Es la
// misma que valida el servidor.
export const AREA_TOLERANCE = 0.05;

// Las áreas se escriben con dos decimales: por debajo de media centésima no hay diferencia que
// avisar.
const NOTICEABLE_DIFFERENCE_HECTARES = 0.005;

export type KnownNeighbour = Neighbour & { code: string };

export type PlotCheckInput = {
  declaredAreaHectares: number | null;
  vertices: readonly GeoPoint[];
  farmAreaHectares: number;
  // Lo que ya ocupan las demás parcelas activas de la finca, sin contar la que se edita.
  otherAllocatedHectares: number;
  // Las demás parcelas activas con polígono: del servidor, de la caché o pendientes.
  neighbours: readonly KnownNeighbour[];
};

export type PlotCheck = {
  // Vacío mientras no hay vértices; con vértices, lo primero que falla o null.
  polygonProblem: PolygonProblem | null;
  hasPolygon: boolean;
  measuredAreaHectares: number | null;
  perimeterMetres: number | null;
  availableHectares: number;
  exceedsFarmArea: boolean;
  // Más del 5 % de diferencia: no se guarda.
  areaMismatch: boolean;
  // Hay diferencia pero dentro de la tolerancia: se guarda y se avisa.
  areaDifferenceNotice: boolean;
  overlaps: { id: string; code: string; areaHectares: number }[];
  overlapRegions: GeoPoint[][];
  // Null si no hay superposición o no existe un solo polígono que sugerir.
  suggestion: SuggestedVertex[] | null;
};

const toCentihectares = (hectares: number) => Math.round(hectares * 100);

// Todo lo que el dispositivo puede comprobar sin el servidor. Bloquea el guardado pero es
// orientativo: el servidor conoce parcelas que el dispositivo no y es quien decide.
export function checkPlot(input: PlotCheckInput): PlotCheck {
  const { declaredAreaHectares: declared, vertices } = input;
  const hasVertices = vertices.length > 0;
  const problem = hasVertices ? polygonProblem(vertices) : null;
  const isValidPolygon = hasVertices && problem === null;

  const measured = isValidPolygon ? polygonAreaHectares(vertices) : null;
  const availableCenti =
    toCentihectares(input.farmAreaHectares) -
    toCentihectares(input.otherAllocatedHectares);

  const hasDeclared = declared !== null && declared > 0;
  const difference =
    hasDeclared && measured !== null ? Math.abs(declared - measured) : 0;
  const areaMismatch =
    hasDeclared && measured !== null && difference > AREA_TOLERANCE * measured;

  const overlaps = isValidPolygon
    ? findOverlaps(vertices, input.neighbours).map((overlap) => ({
        ...overlap,
        code: input.neighbours.find(({ id }) => id === overlap.id)!.code,
      }))
    : [];
  const overlapped = input.neighbours.filter(({ id }) =>
    overlaps.some((overlap) => overlap.id === id),
  );

  return {
    polygonProblem: problem,
    hasPolygon: hasVertices,
    measuredAreaHectares: measured,
    perimeterMetres: hasVertices ? polygonPerimeterMetres(vertices) : null,
    availableHectares: availableCenti / 100,
    exceedsFarmArea: hasDeclared && toCentihectares(declared) > availableCenti,
    areaMismatch,
    areaDifferenceNotice:
      !areaMismatch &&
      measured !== null &&
      difference > NOTICEABLE_DIFFERENCE_HECTARES,
    overlaps,
    overlapRegions: overlaps.length ? overlapRegions(vertices, overlapped) : [],
    suggestion: overlaps.length
      ? suggestAdjustment(
          vertices,
          overlapped.map(({ points }) => points),
        )
      : null,
  };
}
