import { Maximize2, Minimize2 } from 'lucide-react';

import { Button } from '@/components/ui/button';

// Pasa el mapa a pantalla completa y lo devuelve. Con el mapa a pantalla completa es la salida, así
// que dice «Cerrar» con texto y no solo con el símbolo.
export function MapExpandButton({
  expanded,
  onToggle,
}: {
  expanded: boolean;
  onToggle: () => void;
}) {
  const label = expanded ? 'Salir de pantalla completa' : 'Pantalla completa';
  const Icon = expanded ? Minimize2 : Maximize2;
  return (
    <Button
      aria-label={label}
      aria-pressed={expanded}
      className="size-10.5 bg-card shadow-sm"
      onClick={onToggle}
      size="icon"
      title={label}
      type="button"
      variant="outline"
    >
      <Icon aria-hidden="true" className="size-4" />
    </Button>
  );
}
