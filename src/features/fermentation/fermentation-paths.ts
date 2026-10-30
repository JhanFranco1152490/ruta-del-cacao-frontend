import { TURN_PATH } from '@/lib/paths/fermentation';

export {
  FERMENTATION_PATH,
  TURN_PATH,
  turnPath,
} from '@/lib/paths/fermentation';

// Corregir en línea un volteo que ya está en el servidor.
export const turnCorrectionPath = (lotId: string, turnId: string) =>
  `${TURN_PATH}?${new URLSearchParams({ lote: lotId, id: turnId })}`;

// Corregir un volteo que el servidor rechazó y sigue en la cola del dispositivo.
export const queuedTurnCorrectionPath = (lotId: string, turnId: string) =>
  `${TURN_PATH}?${new URLSearchParams({ lote: lotId, pendiente: turnId })}`;
