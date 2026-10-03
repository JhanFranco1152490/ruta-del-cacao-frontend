import type { ComponentType } from 'react';

import type { GeoBounds, GeoPoint } from '@/types/geo';

import type { BaseLayerKind } from './base-layers';

// Lo que debe cumplir cualquier mapa real para usarse dentro de MapPanel. El formulario y sus
// pruebas solo conocen esta forma, nunca la librería de mapas.
export type MapProviderProps = {
  point: GeoPoint | null;
  // Un punto elegido con un toque/clic o arrastrando el marcador.
  onPointChange: (point: GeoPoint) => void;
  disabled: boolean;
  baseLayer: BaseLayerKind;
  // Área que el mapa encuadra cuando cambia (p. ej. el municipio elegido). Quien lo pasa decide
  // cuándo: el formulario solo lo manda si todavía no hay punto, para no mover el de la persona.
  focusBounds?: GeoBounds | null;
  // Falla después de cargar (p. ej. el mapa base no responde sin conexión).
  onError: () => void;
};

export type MapProvider = ComponentType<MapProviderProps>;

// Se importa de forma diferida: la librería de mapas no entra en la carga inicial de la app.
export type LoadMapProvider = () => Promise<MapProvider>;

// Tono del marcador, el mismo de los badges de estado.
export type MapPointTone = 'ok' | 'warn' | 'info' | 'err';

export type MapPoint = {
  id: string;
  label: string;
  detail?: string;
  position: GeoPoint;
  tone: MapPointTone;
};

// Un polígono con etiqueta (p. ej. el contorno de una parcela), sin repetir el primer vértice al
// final. El tono es el mismo de los marcadores.
export type MapShape = {
  id: string;
  label: string;
  detail?: string;
  positions: readonly GeoPoint[];
  tone: MapPointTone;
};

// Mapa de solo consulta con varios puntos (p. ej. todas las fincas de un listado) y, si hace
// falta, polígonos que se encuadran junto con ellos.
export type PointsMapProviderProps = {
  points: readonly MapPoint[];
  shapes?: readonly MapShape[];
  // Un objeto nuevo por pedido: enfocar dos veces el mismo polígono vuelve a llevar el mapa.
  focus?: { shapeId: string };
  onError: () => void;
};

export type PointsMapProvider = ComponentType<PointsMapProviderProps>;

export type LoadPointsMapProvider = () => Promise<PointsMapProvider>;

export type MunicipalityCount = { code: string; count: number };

// Un objeto nuevo por pedido: enfocar dos veces la misma finca vuelve a llevar el mapa.
export type MapFocus = { pointId: string };

export type MunicipalityMapView =
  | { level: 'department'; counts: readonly MunicipalityCount[] }
  | {
      level: 'municipality';
      code: string;
      points: readonly MapPoint[];
      focus?: MapFocus;
    }
  // Mapa libre: todo el departamento con zoom y arrastre, y los municipios solo como referencia.
  | { level: 'free'; points: readonly MapPoint[]; focus?: MapFocus };

// El departamento por municipios y, al elegir uno, ese municipio; o el mapa libre.
export type MunicipalityMapProviderProps = {
  view: MunicipalityMapView;
  baseLayer: BaseLayerKind;
  describeMunicipality: (code: string, count: number) => string;
  onSelectMunicipality: (code: string) => void;
  onSelectPoint: (id: string) => void;
  // El mapa base no carga: el mapa sigue con contorno y puntos.
  onBaseLayerUnavailable: () => void;
  // El mapa base principal falló y se pasó al de respaldo: el mapa se ve, pero con otro proveedor.
  onBaseLayerFallback: () => void;
  // El mapa no puede dibujarse (p. ej. no cargaron los contornos).
  onError: () => void;
};

export type MunicipalityMapProvider =
  ComponentType<MunicipalityMapProviderProps>;

export type LoadMunicipalityMapProvider =
  () => Promise<MunicipalityMapProvider>;
