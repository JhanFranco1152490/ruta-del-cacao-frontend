// Cadenas y no números: se escriben a mano en el formulario y la API las serializa como
// decimales en texto para no perder precisión.
export type Coordinates = {
  latitude: string;
  longitude: string;
};

// Un punto ya validado, como lo necesitan el GPS y los mapas.
export type GeoPoint = {
  latitude: number;
  longitude: number;
};

// Rectángulo geográfico, en grados decimales.
export type GeoBounds = {
  south: number;
  west: number;
  north: number;
  east: number;
};
