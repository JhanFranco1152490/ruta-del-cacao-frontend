'use client';

import type { FormEvent } from 'react';

import { FormDialogForm } from '@/components/form-dialog';
import { useIsOnline } from '@/hooks/use-is-online';

const WHAT_BECOMES_PUBLIC =
  'Quien escanee el código verá el municipio y la finca de origen, la variedad, las fechas de cada etapa, la clasificación y el porcentaje de granos bien fermentados. No verá precios, compradores ni datos personales.';

// Antes de generar se dice qué va a ser público: generar el código es la autorización del productor.
// El token lo crea el servidor, así que sin conexión no se puede.
export function LotQrGenerate({
  isSaving,
  error,
  onGenerate,
}: {
  isSaving: boolean;
  error?: string;
  onGenerate: () => void;
}) {
  const online = useIsOnline();
  return (
    <FormDialogForm
      description={WHAT_BECOMES_PUBLIC}
      error={error}
      isSaving={isSaving}
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        onGenerate();
      }}
      pendingLabel="Generando…"
      submitDisabled={!online}
      submitLabel="Generar código QR"
      title="Código QR del lote"
    >
      {!online && (
        <p className="text-sm font-bold text-warn" role="status">
          Necesitas conexión para generar el código QR.
        </p>
      )}
    </FormDialogForm>
  );
}
