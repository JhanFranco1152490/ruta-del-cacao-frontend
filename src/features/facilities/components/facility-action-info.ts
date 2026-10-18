import {
  Package,
  Pencil,
  Power,
  PowerOff,
  Trash2,
  type LucideIcon,
} from 'lucide-react';

import type { FacilityActionKind } from '../facility-actions';

// Cómo se ve cada acción de un elemento, en el menú de la fila y en la hoja del celular. Todas
// necesitan conexión: las que escriben, y Ver el lote, porque la ficha del lote solo se consulta
// en línea.
export const FACILITY_ACTION_INFO: Record<
  FacilityActionKind,
  { label: string; Icon: LucideIcon; destructive?: boolean }
> = {
  edit: { label: 'Editar', Icon: Pencil },
  deactivate: { label: 'Desactivar', Icon: PowerOff },
  activate: { label: 'Activar', Icon: Power },
  'view-lot': { label: 'Ver el lote', Icon: Package },
  delete: { label: 'Eliminar', Icon: Trash2, destructive: true },
};
