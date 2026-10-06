'use client';

import { useRouter } from 'next/navigation';

import { FarmGateFromQuery } from '@/features/farms/components/farm-gate-from-query';
import { FarmPicker } from '@/features/farms/components/farm-picker';
import { NewPlotScreen } from '@/features/plots/components/new-plot-screen';
import { plotNewPath } from '@/features/plots/plot-paths';

// Aquí se juntan los dos dominios: la pantalla de parcelas recibe la finca ya leída, sin saber
// cómo se lee. Es de cliente porque la finca se entrega como función. Sin finca en la dirección
// se ofrece elegirla: así se llega a registrar una parcela desde la lista de fincas sin abrir
// antes la finca.
export function NewPlotWithFarm() {
  const router = useRouter();
  return (
    <FarmGateFromQuery
      missing={
        <div className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8 sm:px-8">
          <h1 className="text-3xl text-selva">Registrar parcela</h1>
          <p className="text-muted-foreground">
            ¿En qué finca? Busca la finca por su nombre.
          </p>
          <FarmPicker onPick={(id) => router.push(plotNewPath(id))} />
        </div>
      }
    >
      {(farm) => <NewPlotScreen farm={farm} />}
    </FarmGateFromQuery>
  );
}
