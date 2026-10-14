'use client';

import { FarmForm } from '@/features/farms/components/farm-form';
import { plotNewPath } from '@/features/plots/plot-paths';

// Aquí se juntan los dos dominios: al registrar una finca, el aviso ofrece registrar su primera
// parcela. Es de cliente porque el siguiente paso se entrega como función.
export function NewFarmWithNextStep() {
  return (
    <FarmForm
      nextStep={(farmId) => ({
        label: 'Registrar parcela',
        href: plotNewPath(farmId),
      })}
    />
  );
}
