export type BaseLayerKind = 'map' | 'satellite';

export type TileSource = {
  url: string;
  attribution: string;
  maxZoom: number;
};

const OSM_ATTRIBUTION =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

// `{r}` pide la versión de alta densidad en las pantallas que la necesitan.
const STADIA_OUTDOORS: TileSource = {
  url: 'https://tiles.stadiamaps.com/tiles/outdoors/{z}/{x}/{y}{r}.png',
  attribution: `&copy; <a href="https://stadiamaps.com/">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/">OpenMapTiles</a> ${OSM_ATTRIBUTION}`,
  maxZoom: 20,
};

// La política de uso de OpenStreetMap exige la atribución y no permite descargar teselas en
// masa (por eso no se guardan para usarlas sin conexión).
const OPENSTREETMAP: TileSource = {
  url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: OSM_ATTRIBUTION,
  maxZoom: 19,
};

const ESRI_IMAGERY: TileSource = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
  attribution:
    'Tiles &copy; Esri &mdash; Esri, Maxar, Earthstar Geographics y la comunidad de usuarios SIG',
  maxZoom: 19,
};

// Cada mapa base con sus fuentes en orden de preferencia: si una no entrega ni una tesela
// (cupo agotado, dominio no autorizado, proveedor caído), se usa la siguiente.
export const BASE_LAYERS: Record<BaseLayerKind, readonly TileSource[]> = {
  map: [STADIA_OUTDOORS, OPENSTREETMAP],
  satellite: [ESRI_IMAGERY],
};

// Decide cuándo cambiar de fuente. Una tesela suelta que falla después de que la fuente ya
// cargó otra no es motivo para cambiar; las fallas que llegan tarde de una fuente abandonada se
// ignoran, y el agotamiento se avisa una sola vez.
export function createTileFallback(sourceCount: number) {
  let current = 0;
  let loaded = false;
  let exhausted = false;
  return {
    tileLoaded(index: number) {
      if (index === current) loaded = true;
    },
    tileFailed(index: number): 'ignore' | 'next' | 'exhausted' {
      if (index !== current || loaded || exhausted) return 'ignore';
      if (current + 1 < sourceCount) {
        current += 1;
        return 'next';
      }
      exhausted = true;
      return 'exhausted';
    },
  };
}
