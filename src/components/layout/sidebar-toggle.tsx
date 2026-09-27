import { PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { cn } from 'cn';

import { Button } from '@/components/ui/button';
import { FOCUS_OUTLINE_CLASS } from '@/components/ui/focus-outline';

// Solo tiene sentido con la barra fija (lg en adelante); por debajo la navegación ya es un
// panel que se abre y se cierra.
export function SidebarToggle({
  hidden,
  onToggle,
}: {
  hidden: boolean;
  onToggle: () => void;
}) {
  const Icon = hidden ? PanelLeftOpen : PanelLeftClose;
  const label = hidden ? 'Mostrar barra lateral' : 'Ocultar barra lateral';

  return (
    <Button
      type="button"
      variant="outline"
      size="icon-lg"
      title={label}
      className={cn(
        'hidden size-11 shrink-0 border-border bg-card text-selva transition-colors hover:border-selva hover:bg-muted active:bg-surface-alt lg:inline-flex',
        FOCUS_OUTLINE_CLASS,
      )}
      aria-expanded={!hidden}
      aria-controls="barra-lateral"
      onClick={onToggle}
    >
      <Icon
        aria-hidden="true"
        className="size-5 transition-transform duration-200 group-hover/button:scale-110 motion-reduce:transition-none"
      />
      <span className="sr-only">{label}</span>
    </Button>
  );
}
