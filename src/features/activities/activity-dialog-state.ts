import type { ActivityType } from './activity-state';

// El diálogo abierto sobre la lista. De una actividad se guarda solo el id: el detalle la muestra
// como está en la lista, también después de que una acción la cambie.
export type PendingDialog =
  // Programar, con lo que ya se sabe cuando se hace desde un día o una parcela del calendario.
  | {
      kind: 'schedule';
      date?: string;
      farmId?: string;
      plotId?: string;
      // Un monitoreo se programa con su botón: el formulario lo trae elegido.
      activityType?: ActivityType;
    }
  // Todas las de un día (de una parcela, si viene `plotId`) cuando la celda no las muestra todas.
  | { kind: 'day'; date: string; plotId?: string }
  | { kind: 'detail'; id: string }
  | { kind: 'edit'; id: string }
  | { kind: 'delete'; id: string };
