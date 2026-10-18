import {
  Package,
  Pencil,
  Power,
  PowerOff,
  Trash2,
  type LucideIcon,
} from 'lucide-react';

import type { FacilityActionKind } from '../facility-actions';

// Cómo se ve cada acción de un elemento, en el menú de la fila y en la hoja del celular.
export const FACILITY_ACTION_INFO: Record<
  FacilityActionKind,
  { label: string; Icon: LucideIcon; destructive?: boolean; online: boolean }
> = {
  edit: { label: 'Editar', Icon: Pencil, online: true },
  deactivate: { label: 'Desactivar', Icon: PowerOff, online: true },
  activate: { label: 'Activar', Icon: Power, online: true },
  // Ver el lote no escribe nada: también sin conexión.
  'view-lot': { label: 'Ver el lote', Icon: Package, online: false },
  delete: { label: 'Eliminar', Icon: Trash2, destructive: true, online: true },
};
