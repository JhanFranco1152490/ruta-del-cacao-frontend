export const PERIOD_ERROR_MESSAGE =
  'La fecha final no puede ser anterior a la inicial.';

export const periodError = (from: string | null, to: string | null) =>
  from && to && from > to ? PERIOD_ERROR_MESSAGE : null;
