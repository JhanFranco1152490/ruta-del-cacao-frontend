'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { OfflineBanner } from '@/components/offline-banner';
import { useFinishSave } from '@/hooks/use-finish-save';
import { useSession } from '@/hooks/use-session';

import { emptyFarmForm } from '../schemas';
import { useFarmSyncStatus } from '../use-farm-sync-status';
import { useFarmCreate } from '../use-farm-queue';
import { FarmFormFields } from './farm-form-fields';

export type FarmNextStep = { label: string; href: string };

export function FarmForm({
  nextStep,
}: {
  // El paso que sigue a registrar una finca («Registrar parcela»), que ofrece el aviso al guardar.
  // Lo da quien monta el formulario, porque la pantalla de parcelas es de otro dominio.
  nextStep?: (farmId: string) => FarmNextStep;
}) {
  // Un id por formulario: si se guarda dos veces (doble toque, reintento), la cola lo reconoce
  // y no duplica la finca.
  const [farmId] = useState(() => crypto.randomUUID());
  const router = useRouter();
  const create = useFarmCreate();
  const sync = useFarmSyncStatus();
  const { data: user } = useSession();
  const { finish } = useFinishSave('/fincas');
  // La cuenta técnica no tiene un productor propio: elige de cuál es la finca.
  const chooseProducer = user?.is_superuser === true;

  return (
    <FarmFormFields
      breadcrumb={[
        { label: 'Fincas', href: '/fincas' },
        { label: 'Registrar finca' },
      ]}
      chooseProducer={chooseProducer}
      defaultValues={emptyFarmForm}
      title="Registrar finca"
      description="Los campos marcados son obligatorios. Si no hay conexión, la finca se guarda en este dispositivo y se envía cuando vuelva la conexión."
      banner={sync.showBanner && <OfflineBanner status={sync.status} />}
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
          {
            onSuccess: () => {
              const next = nextStep?.(farmId);
              finish(
                'Finca registrada',
                next && {
                  action: {
                    label: next.label,
                    onClick: () => router.push(next.href),
                  },
                },
              );
            },
          },
        )
      }
    />
  );
}
