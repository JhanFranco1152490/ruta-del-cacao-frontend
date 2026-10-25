'use client';

import { FormDialog } from '@/components/form-dialog';
import { LoadingBlock } from '@/components/loading-block';
import { formatDecimal } from '@/lib/format/decimal';
import { farmLabel } from '@/lib/format/place-label';

import { type Drying, useStartOptions } from '../api';
import { StartDryingForm } from './start-drying-form';

// El lote que se inicia, venga de la lista de listos o de su ficha.
export type StartLot = {
  id: string;
  code: string;
  greenWeightKg: string;
  farm: { code: string; name: string };
};

// Iniciar el secado de un lote, o corregir su inicio si llega `drying`. Pide primero las
// marquesinas libres y los responsables: sin ellos no hay formulario que llenar.
export function StartDryingDialog({
  lot,
  drying,
  facilitiesHref,
  onClose,
  onSaved,
}: {
  lot: StartLot;
  drying?: Drying;
  // La infraestructura de la finca del lote; falta si la cuenta no puede consultarla.
  facilitiesHref?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const options = useStartOptions(lot.id);
  const title = drying
    ? `Corregir inicio · ${lot.code}`
    : `Iniciar secado · ${lot.code}`;
  const description = `${formatDecimal(lot.greenWeightKg, 1)} kg en verde · ${farmLabel(lot.farm)}`;
  const submitLabel = drying ? 'Guardar' : 'Iniciar';

  if (!options.data) {
    return (
      <FormDialog
        description={description}
        error={
          options.isError
            ? 'No fue posible cargar las marquesinas disponibles. Cierra e inténtalo de nuevo.'
            : undefined
        }
        isSaving={false}
        onClose={onClose}
        onSubmit={(event) => event.preventDefault()}
        submitDisabled
        submitLabel={submitLabel}
        title={title}
      >
        {options.isPending && (
          <LoadingBlock label="Cargando marquesinas" shapes={['h-40']} />
        )}
      </FormDialog>
    );
  }
  return (
    <StartDryingForm
      description={description}
      drying={drying}
      facilitiesHref={facilitiesHref}
      lot={lot}
      onClose={onClose}
      onSaved={onSaved}
      options={options.data}
      reloadOptions={() => void options.refetch()}
      submitLabel={submitLabel}
      title={title}
    />
  );
}
