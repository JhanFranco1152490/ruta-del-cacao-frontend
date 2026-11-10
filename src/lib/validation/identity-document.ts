// La misma regla del servidor para el documento de una persona o una empresa: solo dígitos, sin
// puntos, guiones ni el dígito de verificación del NIT. Se guarda como texto para no perder los
// ceros iniciales.
export const IDENTITY_DOCUMENT_PATTERN = /^[0-9]{6,15}$/;

export const IDENTITY_DOCUMENT_MESSAGE =
  'Ingresa solo números, entre 6 y 15 dígitos.';

export const isIdentityDocument = (value: string) =>
  IDENTITY_DOCUMENT_PATTERN.test(value);
