import type { GeoPoint } from '@/types/geo';

// Zoom al mostrar un solo punto, y tope al encuadrar varios: lo bastante cerca para ubicar la
// finca sin perder las veredas vecinas.
export const POINT_ZOOM = 15;
export const MAX_FIT_ZOOM = 14;

export type MapView =
  | { kind: 'area' }
  | { kind: 'point'; center: GeoPoint }
  | { kind: 'bounds'; points: readonly GeoPoint[] };

// Sin puntos se muestra la zona de operación; con uno, se centra en él; con varios, se
// encuadran todos.
export function viewFor(points: readonly GeoPoint[]): MapView {
  if (points.length === 0) return { kind: 'area' };
  if (points.length === 1) return { kind: 'point', center: points[0] };
  return { kind: 'bounds', points };
}

// Firma de un conjunto de puntos: el mapa solo se vuelve a encuadrar cuando cambian los
// puntos, no en cada render.
export const pointsKey = (points: readonly GeoPoint[]) =>
  points.map(({ latitude, longitude }) => `${latitude},${longitude}`).join('|');

// Ancho aproximado de un carácter de la etiqueta de una parcela (negrita de 13 px) y el aire que
// necesita alrededor.
const LABEL_CHARACTER_PX = 8;
const LABEL_PADDING_PX = 16;
const LABEL_HEIGHT_PX = 22;

// El nombre de una parcela solo se muestra cuando cabe dentro de su polígono tal como se ve en
// pantalla. Con el mapa alejado, los códigos se apilarían unos sobre otros y taparían todo; la
// parcela sigue ahí, y tocarla dice cómo se llama.
export const plotLabelFits = (
  pixelWidth: number,
  pixelHeight: number,
  label: string,
) =>
  pixelWidth >= label.length * LABEL_CHARACTER_PX + LABEL_PADDING_PX &&
  pixelHeight >= LABEL_HEIGHT_PX;
