import type { WarehouseAction } from '@/lib/paths/warehouse';

import type { Grade } from './api';

// El formulario que se pide abrir sobre un lote: desde una fila, una tarjeta o un enlace de otra
// pantalla. El diálogo lee el lote completo; la fila de existencias propone además su calibre.
export type DialogRequest = {
  action: WarehouseAction;
  lotId: string;
  grade?: Grade;
};
