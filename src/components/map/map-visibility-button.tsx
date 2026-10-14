import { PanelTopClose, PanelTopOpen } from 'lucide-react';

import { Button } from '@/components/ui/button';

// Ocultar el mapa libera la pantalla cuando lo que se trabaja está debajo (la lista, el
// formulario). Solo lleva el símbolo: el nombre accesible dice qué hará el toque. Sobre el mapa
// es del tamaño de los demás controles y con fondo, para leerse sobre cualquier imagen.
export function MapVisibilityButton({
  visible,
  onToggle,
}: {
  visible: boolean;
  onToggle: () => void;
}) {
  const label = visible ? 'Ocultar mapa' : 'Mostrar mapa';
  const Icon = visible ? PanelTopClose : PanelTopOpen;
  return (
    <Button
      aria-expanded={visible}
      aria-label={label}
      className={
        visible
          ? 'size-10.5 bg-card shadow-sm aria-expanded:bg-card'
          : 'size-10.5'
      }
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
