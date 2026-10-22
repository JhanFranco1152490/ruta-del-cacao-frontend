import type { PlotCharacterization } from './api';
import type { QueuedCharacterization } from './characterization-queue';

export const NO_CATALOG_MESSAGE =
  'Necesitas conexión una vez para cargar las variedades de cacao.';

// La ficha que trae `stale_version` con el error: la vigente en el servidor, o null si allá la
// parcela no tiene. undefined si el error no es ese.
export function staleCurrent(
  queued: QueuedCharacterization | null | undefined,
): PlotCharacterization | null | undefined {
  if (queued?.errorCode !== 'stale_version') return undefined;
  const data = queued.errorData as
    { current?: PlotCharacterization | null } | undefined;
  return data?.current ?? null;
}

// Contra qué ficha del servidor se guarda: la vigente que trajo un conflicto o la que se leyó. La
// versión con la que se envía es la de esa ficha; para una pendiente sin conflicto, la que tenía
// cuando se guardó en el dispositivo.
export function characterizationBase(
  pending: QueuedCharacterization | undefined,
  fromServer: PlotCharacterization | undefined,
) {
  const current = staleCurrent(pending);
  const expectedVersion =
    current !== undefined
      ? (current?.version ?? null)
      : pending
        ? pending.expectedVersion
        : (fromServer?.version ?? null);
  return {
    current,
    expectedVersion,
    serverCharacterization: current ?? fromServer,
  };
}

// Por qué no se puede editar la ficha, o null si se puede.
export function characterizationBlockedMessage({
  farmActive,
  plotActive,
  hasCatalog,
  syncBlocked,
}: {
  farmActive: boolean;
  plotActive: boolean;
  hasCatalog: boolean;
  syncBlocked: string | null;
}) {
  if (!farmActive) {
    return 'La finca está inactiva: la caracterización de sus parcelas no se puede editar. Reactívala para continuar.';
  }
  if (!plotActive) {
    return 'La parcela está inactiva: su caracterización no se puede editar. Reactívala para continuar.';
  }
  return hasCatalog ? syncBlocked : NO_CATALOG_MESSAGE;
}
