import type { ComponentType } from 'react';

import type { GeoPoint } from '@/types/geo';

// Lo que debe cumplir cualquier mapa real para usarse dentro de MapPanel. El formulario y sus
// pruebas solo conocen esta forma, nunca la librería de mapas.
export type MapProviderProps = {
  point: GeoPoint | null;
  // Un punto elegido con un toque/clic o arrastrando el marcador.
  onPointChange: (point: GeoPoint) => void;
  disabled: boolean;
  // Falla después de cargar (p. ej. el mapa base no responde sin conexión).
  onError: () => void;
};

export type MapProvider = ComponentType<MapProviderProps>;

// Se importa de forma diferida: la librería de mapas no entra en la carga inicial de la app.
export type LoadMapProvider = () => Promise<MapProvider>;
