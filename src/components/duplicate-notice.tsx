import { Button } from '@/components/ui/button';

// Ante un nombre repetido se sugiere usar el que ya existe en vez de inventar otro nombre: verlo
// en la lista o, si está inactivo, activarlo. Cada catálogo dice cómo se nombra lo suyo.
export function DuplicateNotice({
  active,
  showLabel,
  inactiveText,
  disabled,
  onShow,
  onActivate,
}: {
  // Si el que ya existe está activo.
  active: boolean;
  // «Ver el insumo existente», «Ver el elemento».
  showLabel: string;
  // «Urea 46 % está inactivo.»
  inactiveText: string;
  disabled: boolean;
  onShow: () => void;
  onActivate: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {active ? (
        <Button
          disabled={disabled}
          onClick={onShow}
          type="button"
          variant="link"
        >
          {showLabel}
        </Button>
      ) : (
        <>
          <span>{inactiveText}</span>
          <Button
            disabled={disabled}
            onClick={onActivate}
            size="office"
            type="button"
            variant="outline"
          >
            Activarlo
          </Button>
        </>
      )}
    </div>
  );
}
