'use client';

import { ActivityListScreen } from '@/features/activities/components/activity-list-screen';
import { formatStock, inputPackageOf } from '@/features/inputs/stock-format';

// Aquí se juntan los dominios: las actividades no conocen las unidades ni las presentaciones de
// los insumos, así que la página les pasa cómo escribir lo que gastó una labor ("100 kg · 2
// bultos").
export function ActivitiesWithInputs() {
  return (
    <ActivityListScreen
      formatUsedInput={({ input, quantity }) =>
        formatStock(quantity, input.unit, inputPackageOf(input))
      }
    />
  );
}
