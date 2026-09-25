const apiUrl = process.env.NEXT_PUBLIC_API_URL;

// Las variables NEXT_PUBLIC_* se incrustan al compilar: si falta en producción, la app
// saldría apuntando a localhost y "no cargaría nada" sin un error claro. Mejor romper el
// build y enterarse de inmediato.
if (!apiUrl && process.env.NODE_ENV === 'production') {
  throw new Error(
    'Falta NEXT_PUBLIC_API_URL: es obligatoria en producción. En `pnpm dev` y en las pruebas cae a http://localhost:8000.',
  );
}

export const API_URL = (apiUrl ?? 'http://localhost:8000').replace(/\/+$/, '');
