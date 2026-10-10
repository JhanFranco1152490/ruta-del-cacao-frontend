import { Button } from '@/components/ui/button';

import type { ExistingInput } from '../api';

// Ante un nombre repetido se sugiere usar el que ya existe en vez de inventar otro nombre: verlo
// en la lista o, si está inactivo, activarlo.
export function InputDuplicateNotice({
  existing,
  disabled,
  onShow,
  onActivate,
}: {
  existing: ExistingInput;
  disabled: boolean;
  onShow: () => void;
  onActivate: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      {existing.is_active ? (
        <Button
          disabled={disabled}
          onClick={onShow}
          type="button"
          variant="link"
        >
          Ver el insumo existente
        </Button>
      ) : (
        <>
          <span>{existing.name} está inactivo.</span>
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
