import { useMutation, useQueryClient } from '@tanstack/react-query';

import { apiFetch } from '@/lib/api/client';
import { queryKeys } from '@/lib/api/query-keys';

import type { Sale, SaleCreateRequest, SaleVoidRequest } from './api';

// Registrar o anular una venta mueve existencias: se vuelven a leer Ventas, Bodega y Lotes (la
// sección Bodega de la ficha de cada lote), y con ellos sus copias en el dispositivo. Cambiar el
// soporte solo cambia la venta, pero invalidar lo mismo deja una sola regla.
function useInvalidateAfterSaleChange() {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: queryKeys.sales.all() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.warehouse.all() }),
      queryClient.invalidateQueries({ queryKey: queryKeys.lots.all() }),
    ]);
}

// Todo se registra con conexión: nada de ventas pasa por la cola.
function useSaleWrite<TBody, TResult>(
  write: (body: TBody) => Promise<TResult>,
) {
  const invalidate = useInvalidateAfterSaleChange();
  return useMutation({
    networkMode: 'always',
    mutationFn: write,
    onSettled: () => invalidate(),
  });
}

const salePath = (id: string, rest = '') =>
  `/api/sales/${encodeURIComponent(id)}${rest}`;

// El archivo viaja como formulario de varias partes: en base64 dentro de un JSON pesaría un tercio
// más.
export function putInvoice(saleId: string, file: File) {
  const form = new FormData();
  form.set('file', file, file.name);
  return apiFetch<Sale>(salePath(saleId, '/invoice'), {
    method: 'PUT',
    body: form,
  });
}

export type RegisteredSale = {
  sale: Sale;
  // El rechazo del soporte cuando la venta sí quedó guardada; `null` si se adjuntó o no había.
  invoiceError: unknown;
};

// Primero la venta y, si hay archivo, enseguida su soporte. Si el soporte falla la venta ya existe:
// no se deshace, se avisa para adjuntarlo desde la ficha.
export async function registerSale(
  request: SaleCreateRequest,
  invoice: File | null,
): Promise<RegisteredSale> {
  const sale = await apiFetch<Sale>('/api/sales', {
    method: 'POST',
    body: request,
  });
  if (!invoice) return { sale, invoiceError: null };
  try {
    return { sale: await putInvoice(sale.id, invoice), invoiceError: null };
  } catch (error) {
    return { sale, invoiceError: error };
  }
}

export const useRegisterSale = () =>
  useSaleWrite(
    ({
      request,
      invoice,
    }: {
      request: SaleCreateRequest;
      invoice: File | null;
    }) => registerSale(request, invoice),
  );

export const useVoidSale = (id: string) =>
  useSaleWrite((body: SaleVoidRequest) =>
    apiFetch<Sale>(salePath(id, '/void'), { method: 'POST', body }),
  );

// Adjunta el soporte, o lo reemplaza si ya tenía uno.
export const useAttachInvoice = (id: string) =>
  useSaleWrite((file: File) => putInvoice(id, file));

export const useRemoveInvoice = (id: string) =>
  useSaleWrite(() =>
    apiFetch<void>(salePath(id, '/invoice'), { method: 'DELETE' }),
  );
