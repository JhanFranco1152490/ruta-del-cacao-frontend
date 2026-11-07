import { z } from 'zod';

import { REQUIRED_FIELD_MESSAGE } from '@/lib/validation/messages';

import type { Warehouse, WarehouseInput, WarehouseUpdate } from './api';

export const WAREHOUSE_NAME_MAX_LENGTH = 40;

export type WarehouseFormInput = { farm_id: string; name: string };

export const warehouseFormSchema = z.object({
  farm_id: z.string().min(1, REQUIRED_FIELD_MESSAGE),
  name: z
    .string()
    .trim()
    .min(1, REQUIRED_FIELD_MESSAGE)
    .max(
      WAREHOUSE_NAME_MAX_LENGTH,
      `Máximo ${WAREHOUSE_NAME_MAX_LENGTH} caracteres.`,
    ),
});

// Vacío para registrar (con la finca, si solo hay una); con la bodega para editar.
export const warehouseFormOf = (
  warehouse: Warehouse | undefined,
  farmId: string,
): WarehouseFormInput => ({
  farm_id: warehouse?.farm.id ?? farmId,
  name: warehouse?.name ?? '',
});

export const toWarehouseRequest = (
  values: WarehouseFormInput,
): WarehouseInput => ({ farm_id: values.farm_id, name: values.name.trim() });

// Al editar solo cambia el nombre: la finca no se cambia. Sin cambios no hay nada que enviar.
export function toWarehouseUpdate(
  values: WarehouseFormInput,
  warehouse: Warehouse,
): WarehouseUpdate | null {
  const name = values.name.trim();
  if (name === warehouse.name) return null;
  return { expected_version: warehouse.version, name };
}

export const WAREHOUSE_SAVED = 'Bodega registrada.';
export const WAREHOUSE_UPDATED = 'Bodega actualizada.';
export const WAREHOUSE_ACTIVATED = 'Bodega activada.';
export const WAREHOUSE_DEACTIVATED = 'Bodega desactivada.';
export const WAREHOUSE_DELETED = 'Bodega eliminada.';
export const NO_CHANGES = 'No hubo cambios que guardar.';
