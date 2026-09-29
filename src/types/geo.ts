// Cadenas y no números: se escriben a mano en el formulario y la API las serializa como
// decimales en texto para no perder precisión.
export type Coordinates = {
  latitude: string;
  longitude: string;
};
