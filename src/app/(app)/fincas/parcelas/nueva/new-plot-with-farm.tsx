'use client';

import { Info } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';

import { CacaoPlant } from '@/components/brand/cacao-plant';
import { PageHeader } from '@/components/page-header';
import { FarmGateFromQuery } from '@/features/farms/components/farm-gate-from-query';
import { FarmPicker } from '@/features/farms/components/farm-picker';
import { NewPlotScreen } from '@/features/plots/components/new-plot-screen';
import { plotNewPath } from '@/features/plots/plot-paths';
import { readOrigin, withOrigin } from '@/lib/navigation/origin';

// Aquí se juntan los dos dominios: la pantalla de parcelas recibe la finca ya leída, sin saber
// cómo se lee. Es de cliente porque la finca se entrega como función. Sin finca en la dirección
// se ofrece elegirla: así se llega a registrar una parcela desde la lista de fincas sin abrir
// antes la finca.
export function NewPlotWithFarm() {
  const router = useRouter();
  const origin = readOrigin(useSearchParams());
  return (
    <FarmGateFromQuery
      missing={
        <div className="mx-auto w-full max-w-4xl px-4 py-6 sm:px-8">
          <PageHeader
            compact
            description="¿En qué finca? Busca la finca por su nombre."
            eyebrow="Parcelas"
            title="Registrar parcela"
          />
          <div className="mt-6 flex items-center gap-8 rounded-[var(--radius-card)] bg-card p-5 shadow-card sm:p-8">
            <div className="min-w-0 flex-1 space-y-4">
              <FarmPicker
                onPick={(id) =>
                  router.push(withOrigin(plotNewPath(id), origin ?? ''))
                }
              />
              <p className="flex items-start gap-2 text-sm text-muted-foreground">
                <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                En el siguiente paso pones el código, el área y, si quieres, el
                polígono. Puedes hacerlo sin conexión.
              </p>
            </div>
            <CacaoPlant
              aria-hidden="true"
              className="hidden h-44 w-48 shrink-0 md:block"
            />
          </div>
        </div>
      }
    >
      {(farm) => <NewPlotScreen farm={farm} />}
    </FarmGateFromQuery>
  );
}
