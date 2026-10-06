import { Info } from 'lucide-react';

export const ACTING_PRODUCER_NOTICE_ID = 'acting-producer-notice';
export const ACTING_PRODUCER_REASON =
  'Elige un productor en el encabezado para registrar o editar aquí.';

// La cuenta técnica ve la pantalla completa, pero lo que escribe necesita un productor: esto dice
// qué falta, y las acciones deshabilitadas lo señalan con `aria-describedby`.
export function ActingProducerNotice() {
  return (
    <p
      id={ACTING_PRODUCER_NOTICE_ID}
      role="status"
      className="flex items-center gap-2 rounded-md bg-warn-bg px-4 py-3 text-sm font-bold text-warn"
    >
      <Info aria-hidden="true" className="size-5 shrink-0" />
      {ACTING_PRODUCER_REASON}
    </p>
  );
}
