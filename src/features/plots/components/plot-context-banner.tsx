import { Info } from 'lucide-react';

// A quien no tiene un productor propio (la asociación, la cuenta técnica) le dice en qué finca y
// de qué productor está registrando: lo que escribe queda a nombre de ese productor.
export function PlotContextBanner({
  farmName,
  producerLabel,
}: {
  farmName: string;
  producerLabel: string;
}) {
  return (
    <p
      className="flex items-center gap-2 rounded-md bg-info-bg px-4 py-3 text-sm font-bold text-info"
      role="status"
    >
      <Info aria-hidden="true" className="size-5 shrink-0" />
      Registras una parcela en la finca {farmName}, de {producerLabel}.
    </p>
  );
}
