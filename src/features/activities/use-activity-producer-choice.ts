'use client';

import { useState } from 'react';

import { useSession } from '@/hooks/use-session';
import { useFarmDetail } from '@/lib/api/farm-detail';

import type { ActivityPreset } from './activity-form-setup';

// La cuenta técnica puede acotar por productor al programar, salvo que el formulario venga de una
// finca, que ya lo dice (y de ella sale el productor). Es opcional; para las demás cuentas no hay
// nada que elegir. `onChange` limpia lo elegido bajo el productor anterior, que ya no vale.
export function useActivityProducerChoice({
  editing,
  preset,
  onChange,
}: {
  editing: boolean;
  preset: ActivityPreset | undefined;
  onChange: () => void;
}) {
  const { data: user } = useSession();
  const superuser = user?.is_superuser === true;
  const [chosen, setChosen] = useState<string>();
  const presetFarm = useFarmDetail(
    user?.id,
    superuser && !editing ? (preset?.farmId ?? '') : '',
  );
  const choose = (producer: string | undefined) => {
    setChosen(producer);
    onChange();
  };
  return {
    // El campo solo se ofrece cuando hay algo que elegir.
    field:
      superuser && !editing && !preset?.farmId
        ? { value: chosen, onChange: choose }
        : undefined,
    producerId: chosen ?? presetFarm.data?.data.producer.id,
  };
}
