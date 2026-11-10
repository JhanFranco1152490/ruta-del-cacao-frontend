'use client';

import { type ComponentProps, useId } from 'react';

import { TextField } from '@/components/text-field';

import { LOCATION_MAX_LENGTH } from '../entry-form';
import { useStockLocations } from '../queries';

// La ubicación dentro de la bodega, texto libre con las ya usadas en ella como sugerencia: así
// «Estante 3» no se escribe de tres maneras.
export function EntryLocationField({
  warehouseId,
  ...field
}: { warehouseId: string | null } & Omit<
  ComponentProps<typeof TextField>,
  'label' | 'list'
>) {
  const locations = useStockLocations(warehouseId);
  const listId = useId();
  return (
    <>
      <TextField
        autoComplete="off"
        hint="Dentro de la bodega, como «Estante 3» o «Zona A». Déjala vacía si no aplica."
        label="Ubicación (opcional)"
        list={listId}
        maxLength={LOCATION_MAX_LENGTH}
        {...field}
      />
      <datalist id={listId}>
        {(locations.data ?? []).map((location) => (
          <option key={location} value={location} />
        ))}
      </datalist>
    </>
  );
}
