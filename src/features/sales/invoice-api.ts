import { apiFetch } from '@/lib/api/client';

import type { Sale } from './api';

// Sube el soporte de una venta (o lo reemplaza). El archivo viaja como formulario de varias partes:
// en base64 dentro de un JSON pesaría un tercio más. Va en su propio módulo para que las pruebas de
// las pantallas lo puedan reemplazar: en jsdom, `fetch` no envía un `FormData`.
export function putInvoice(saleId: string, file: File) {
  const form = new FormData();
  form.set('file', file, file.name);
  return apiFetch<Sale>(`/api/sales/${encodeURIComponent(saleId)}/invoice`, {
    method: 'PUT',
    body: form,
  });
}
