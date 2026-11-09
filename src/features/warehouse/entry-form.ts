import { z } from 'zod';

import type { EntryCorrection, EntryInput, LotStock, StockEntry } from './api';
import { entryDateIssue } from './warehouse-dates';

export const LOCATION_MAX_LENGTH = 60;
// Lo que se lee donde el ingreso no tiene ubicación.
export const NO_LOCATION_TEXT = 'Sin ubicación';
// Los mismos textos que el servidor.
export const WAREHOUSE_REQUIRED_MESSAGE = 'Elija la bodega';

export type EntryFormInput = {
  entry_date: string;
  warehouse_id: string;
  location: string;
};

// La fecha se valida contra hoy y contra el día de la clasificación del lote, que cambian con cada
// lote: por eso el esquema se arma para él.
export const createEntryFormSchema = (context: {
  today: string;
  classifiedAt: string;
}) =>
  z.object({
    entry_date: z.string().superRefine((date, issues) => {
      const message = entryDateIssue(date, context);
      if (message) issues.addIssue({ code: 'custom', message });
    }),
    warehouse_id: z.string().min(1, WAREHOUSE_REQUIRED_MESSAGE),
    // Opcional: sin ella el lote queda sin ubicación dentro de la bodega.
    location: z
      .string()
      .trim()
      .max(LOCATION_MAX_LENGTH, `Máximo ${LOCATION_MAX_LENGTH} caracteres.`),
  });

// Para ingresar: hoy, la bodega si hay una sola donde ingresar, y sin ubicación. Para corregir: lo
// que tiene el ingreso.
export function entryFormOf({
  entry,
  today,
  onlyWarehouseId,
}: {
  entry: StockEntry | null;
  today: string;
  onlyWarehouseId: string | null;
}): EntryFormInput {
  if (entry) {
    return {
      entry_date: entry.entry_date,
      warehouse_id: entry.warehouse.id,
      location: entry.location,
    };
  }
  return {
    entry_date: today,
    warehouse_id: onlyWarehouseId ?? '',
    location: '',
  };
}

// Los kilos no viajan: son los de la clasificación.
export const toEntryRequest = (
  values: EntryFormInput,
  stock: LotStock,
): EntryInput => ({
  expected_lot_version: stock.lot.version,
  entry_date: values.entry_date,
  warehouse_id: values.warehouse_id,
  location: values.location.trim(),
});

// Solo lo que cambió, con la versión del ingreso leída. Sin cambios no hay nada que enviar.
export function toEntryCorrection(
  values: EntryFormInput,
  entry: StockEntry,
): EntryCorrection | null {
  const changes: Omit<EntryCorrection, 'expected_version'> = {};
  if (values.entry_date !== entry.entry_date) {
    changes.entry_date = values.entry_date;
  }
  if (values.warehouse_id !== entry.warehouse.id) {
    changes.warehouse_id = values.warehouse_id;
  }
  if (values.location.trim() !== entry.location) {
    changes.location = values.location.trim();
  }
  if (Object.keys(changes).length === 0) return null;
  return { expected_version: entry.version, ...changes };
}

export const ENTRY_SAVED = 'Ingreso registrado.';
export const ENTRY_UPDATED = 'Ingreso actualizado.';
