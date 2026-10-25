// Lo que entrega un campo de fecha y hora completo (yyyy-MM-ddTHH:mm); vacío o a medias no es una
// hora.
export const isLocalDateTime = (value: string) =>
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value);

export const FUTURE_MOMENT_MESSAGE = 'No puede ser una fecha futura.';

// Las observaciones de un registro de campo: opcionales y de hasta este largo, como las guarda el
// servidor.
export const NOTES_MAX_LENGTH = 500;
export const NOTES_TOO_LONG_MESSAGE = `Máximo ${NOTES_MAX_LENGTH} caracteres.`;
