import { MapPinned, TriangleAlert } from 'lucide-react';

import { Button } from '@/components/ui/button';

// El punto cae en otro municipio. No bloquea: el GPS falla cerca de los límites y el municipio
// del predio es un dato legal que la persona conoce mejor que el mapa.
export function FarmMunicipalityMismatch({
  pointMunicipality,
  chosenMunicipality,
  onUsePointMunicipality,
}: {
  pointMunicipality: string;
  chosenMunicipality: string;
  onUsePointMunicipality: () => void;
}) {
  return (
    <div
      className="space-y-3 rounded-(--radius) bg-warn-bg px-4 py-3 text-warn"
      role="status"
    >
      <p className="flex items-start gap-2 font-bold">
        <TriangleAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        El punto parece estar en {pointMunicipality}, ¿confirmas{' '}
        {chosenMunicipality}?
      </p>
      <Button
        className="h-10 bg-card"
        onClick={onUsePointMunicipality}
        type="button"
        variant="outline"
      >
        Cambiar a {pointMunicipality}
      </Button>
    </div>
  );
}

// El municipio vacío se completó con el del punto que capturó el GPS.
export function FarmMunicipalitySuggestion({
  municipality,
}: {
  municipality: string;
}) {
  return (
    <p
      className="flex items-start gap-2 text-sm font-bold text-foreground"
      role="status"
    >
      <MapPinned aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      Elegimos {municipality} como municipio según la ubicación del GPS.
      Cámbialo si no corresponde.
    </p>
  );
}
