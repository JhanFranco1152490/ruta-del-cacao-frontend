'use client';

import { FormDialog } from '@/components/form-dialog';
import { LoadingBlock } from '@/components/loading-block';
import { formatDecimal } from '@/lib/format/decimal';
import { farmLabel } from '@/lib/format/place-label';

import { type Fermentation, useStartOptions } from '../api';
import { StartFermentationForm } from './start-fermentation-form';

// El lote que se inicia, venga de la lista de listos o de su ficha.
export type StartLot = {
  id: string;
  code: string;
  greenWeightKg: string;
  farm: { code: string; name: string };
};

// Iniciar la fermentación de un lote, o corregir su inicio si llega `fermentation`. Pide primero
// los cajones libres y los responsables: sin ellos no hay formulario que llenar.
export function StartFermentationDialog({
  lot,
  fermentation,
  facilitiesHref,
  onClose,
  onSaved,
}: {
  lot: StartLot;
  fermentation?: Fermentation;
  // La infraestructura de la finca del lote; falta si la cuenta no puede consultarla.
  facilitiesHref?: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const options = useStartOptions(lot.id);
  const title = fermentation
    ? `Corregir inicio · ${lot.code}`
    : `Iniciar fermentación · ${lot.code}`;
  const description = `${formatDecimal(lot.greenWeightKg, 1)} kg en baba · ${farmLabel(lot.farm)}`;
  const submitLabel = fermentation ? 'Guardar' : 'Iniciar';

  if (!options.data) {
    return (
      <FormDialog
        description={description}
        error={
          options.isError
            ? 'No fue posible cargar los cajones disponibles. Cierra e inténtalo de nuevo.'
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
          <LoadingBlock label="Cargando cajones" shapes={['h-40']} />
        )}
      </FormDialog>
    );
  }
  return (
    <StartFermentationForm
      description={description}
      facilitiesHref={facilitiesHref}
      fermentation={fermentation}
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
