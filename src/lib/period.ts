export const PERIOD_ERROR_MESSAGE =
  'La fecha final no puede ser anterior a la inicial.';

// Un periodo al revés no se pregunta al servidor: se dice en el campo. Con una sola fecha no hay
// nada que comparar.
export const periodError = (from: string | null, to: string | null) =>
  from && to && from > to ? PERIOD_ERROR_MESSAGE : null;
