import type {
  LoadMapProvider,
  LoadPointsMapProvider,
} from '@/components/map/map-provider';

// Proveedor de mapas de la app: Leaflet con el mapa base de OpenStreetMap. Se importa de forma
// diferida para que la librería solo se descargue en las pantallas que muestran un mapa.
// Constantes de módulo a propósito: el panel del mapa vuelve a cargar si la referencia cambia.
export const loadMapProvider: LoadMapProvider | null = () =>
  import('@/components/map/leaflet-maps').then(
    (module) => module.LeafletPointMap,
  );

export const loadPointsMapProvider: LoadPointsMapProvider | null = () =>
  import('@/components/map/leaflet-maps').then(
    (module) => module.LeafletPointsMap,
  );
