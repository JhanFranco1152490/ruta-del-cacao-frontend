// Comprobación permisiva a propósito: solo descarta lo que claramente no es un correo. El
// servidor es quien decide el formato exacto; una regla más estricta aquí impediría iniciar
// sesión o registrar direcciones que el servidor sí acepta (dominios internacionalizados,
// símbolos como `!` en la parte local).
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const isEmail = (value: string) => EMAIL_PATTERN.test(value);
