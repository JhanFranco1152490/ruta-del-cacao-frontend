import type { LoadMapProvider } from '@/components/map/map-provider';

// Proveedor de mapas de la app. Ninguno todavía: mientras sea null, la ubicación de las
// fincas se captura con el GPS o escribiendo las coordenadas, y el mapa no se muestra.
export const loadMapProvider: LoadMapProvider | null = null;
