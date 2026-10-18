import { getErrorMessage, isApiError } from '@/lib/api/errors';
import {
  agreeWith,
  FACILITY_TYPES,
  type FacilityType,
} from '@/lib/facility-labels';

import { FACILITY_ERROR } from './facility-errors';

type Named = { facility_type: FacilityType; name: string };

export const FACILITY_DELETED_MESSAGE = 'Elemento eliminado';

// «Cajón C-03 activado», «Marquesina M-01 activada».
export const activatedMessage = ({ facility_type, name }: Named) =>
  `${FACILITY_TYPES[facility_type].label} ${name} ${agreeWith(facility_type, 'activad')}`;

export const deactivatedMessage = ({ facility_type, name }: Named) =>
  `${FACILITY_TYPES[facility_type].label} ${name} ${agreeWith(facility_type, 'desactivad')}`;

// Los procesos de cada tipo con su artículo: «las fermentaciones en las que», «los secados en los
// que».
const IN_WHICH: Record<FacilityType, string> = {
  fermentation_box: 'Las fermentaciones en las que',
  solar_dryer: 'Los secados en los que',
};

export const deactivateText = ({ facility_type }: Named) =>
  `Dejará de ofrecerse al iniciar ${FACILITY_TYPES[facility_type].processes}. ${IN_WHICH[facility_type]} se usó no cambian. Puedes ${agreeWith(facility_type, 'activarl')} de nuevo cuando quieras.`;

export const activateText = ({ facility_type }: Named) =>
  `Quedará Disponible y se ofrecerá de nuevo al iniciar ${FACILITY_TYPES[facility_type].processes}.`;

// Por qué no se hizo lo pedido sobre un elemento que un lote ocupa.
export const occupiedText = (
  lotCode: string,
  verb: 'desactivar' | 'eliminar',
) =>
  `No se puede ${verb}: lo ocupa el lote ${lotCode}. Se podrá ${verb} cuando termine su proceso.`;

// Lo que dice un diálogo de activar, desactivar o eliminar cuando el servidor rechaza el cambio.
// Uno ocupado no llega aquí: el diálogo cambia al aviso de ocupado.
export function facilityChangeErrorMessage(error: unknown, fallback: string) {
  if (isApiError(error)) {
    if (error.code === FACILITY_ERROR.staleVersion) {
      return 'Otra persona cambió este elemento mientras tanto. Cierra y vuelve a intentarlo con sus datos actuales.';
    }
    if (error.status === 404) return 'Este elemento ya no existe.';
  }
  return getErrorMessage(error, fallback);
}
