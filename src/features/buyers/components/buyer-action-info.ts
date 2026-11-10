import { Pencil, Power, PowerOff, Trash2, type LucideIcon } from 'lucide-react';

import type { BuyerActionKind } from '../buyer-actions';

// Cómo se ve cada acción de un comprador, en la fila, en el menú «⋯» y en la hoja del celular.
export const BUYER_ACTION_INFO: Record<
  BuyerActionKind,
  { label: string; Icon: LucideIcon; destructive?: boolean }
> = {
  edit: { label: 'Editar', Icon: Pencil },
  deactivate: { label: 'Desactivar', Icon: PowerOff },
  activate: { label: 'Activar', Icon: Power },
  delete: { label: 'Eliminar', Icon: Trash2, destructive: true },
};
