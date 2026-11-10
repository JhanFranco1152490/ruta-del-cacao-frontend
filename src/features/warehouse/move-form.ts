import { z } from 'zod';

import type { MoveInput, StockEntry } from './api';
import { LOCATION_MAX_LENGTH, WAREHOUSE_REQUIRED_MESSAGE } from './entry-form';

export type MoveFormInput = { warehouse_id: string; location: string };

export const moveFormSchema = z.object({
  warehouse_id: z.string().min(1, WAREHOUSE_REQUIRED_MESSAGE),
  // Opcional, como al ingresar: vacía deja el cacao sin ubicación dentro de la bodega.
  location: z
    .string()
    .trim()
    .max(LOCATION_MAX_LENGTH, `Máximo ${LOCATION_MAX_LENGTH} caracteres.`),
});

// El formulario abre con el lugar donde está el cacao hoy.
export const moveFormOf = (entry: StockEntry): MoveFormInput => ({
  warehouse_id: entry.warehouse.id,
  location: entry.location,
});

// Con la versión del ingreso leída. Dejarlo donde está no es un movimiento y no se envía.
export function toMoveRequest(
  values: MoveFormInput,
  entry: StockEntry,
): MoveInput | null {
  const location = values.location.trim();
  if (
    values.warehouse_id === entry.warehouse.id &&
    location === entry.location
  ) {
    return null;
  }
  return {
    expected_version: entry.version,
    warehouse_id: values.warehouse_id,
    location,
  };
}

export const MOVE_SAVED = 'Cacao movido.';
