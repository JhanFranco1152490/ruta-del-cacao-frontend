'use client';

import { useState } from 'react';

import { OfflineBanner } from '@/components/offline-banner';

import { emptyFarmForm } from '../schemas';
import { useFarmSyncStatus } from '../use-farm-sync-status';
import { useFarmCreate } from '../use-farm-queue';
import { FarmFormFields } from './farm-form-fields';
import { FarmSavedPanel } from './farm-saved-panel';

export function FarmForm() {
  // Un id por formulario: si se guarda dos veces (doble toque, reintento), la cola lo reconoce
  // y no duplica la finca. Registrar otra finca monta un formulario nuevo con otro id.
  const [farmId, setFarmId] = useState(() => crypto.randomUUID());
  const [savedName, setSavedName] = useState<string | null>(null);
  const create = useFarmCreate();
  const sync = useFarmSyncStatus();

  if (savedName) {
    return (
      <FarmSavedPanel
        farmId={farmId}
        name={savedName}
        onRegisterAnother={() => {
          setFarmId(crypto.randomUUID());
          setSavedName(null);
          create.reset();
        }}
      />
    );
  }

  return (
    <FarmFormFields
      key={farmId}
      defaultValues={emptyFarmForm}
      title="Registrar finca"
      description="Los campos marcados son obligatorios. Si no hay conexión, la finca se guarda en este dispositivo y se envía cuando vuelva la conexión."
      banner={<OfflineBanner status={sync.status} />}
      blockedMessage={sync.blockedMessage}
      submitLabel="Guardar finca"
      isSaving={create.isPending}
      error={
        create.isError
          ? 'No fue posible guardar la finca en el dispositivo. Inténtalo nuevamente.'
          : null
      }
      onSubmit={(values) =>
        create.mutate(
          { id: farmId, values },
          { onSuccess: () => setSavedName(values.name) },
        )
      }
    />
  );
}
