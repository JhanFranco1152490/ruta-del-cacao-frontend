import { ClipboardPen, Flag, Play, Sun } from 'lucide-react';

import type { LotAction } from '@/lib/lot-actions';
import type { LotStatus } from '@/lib/lot-status';

import { DRYING_PATH, logPath } from './drying-paths';

const startPath = (lotId: string) =>
  `${DRYING_PATH}?${new URLSearchParams({ vista: 'listos', iniciar: lotId })}`;

const finishPath = (lotId: string) =>
  `${DRYING_PATH}?${new URLSearchParams({ finalizar: lotId })}`;

// El botón de la cabecera de Lotes cuando se mira un estado: lleva a donde se trabaja ese estado.
// Fermentado: a los lotes listos para secar; En secado: a la pantalla de Secado. En los demás
// estados esta etapa no ofrece nada.
export function dryingStageAction(
  status: LotStatus,
  can: { logLogs: boolean; manage: boolean },
): LotAction | null {
  if (status === 'fermented' && can.manage) {
    return {
      id: 'start-drying',
      label: 'Iniciar secado',
      href: `${DRYING_PATH}?${new URLSearchParams({ vista: 'listos' })}`,
      icon: Play,
    };
  }
  if (status === 'drying' && can.logLogs) {
    return {
      id: 'go-to-drying',
      label: 'Ir a Secado',
      href: DRYING_PATH,
      icon: Sun,
    };
  }
  return null;
}

// Lo que ofrece el secado de un lote en su menú de Lotes. Registrar una bitácora es una página de
// campo y va directo a ella; iniciar y finalizar son formularios de Secado, que se abren al llegar.
// Quien solo registra bitácoras no ve iniciar ni finalizar.
export function dryingLotActions(
  lot: { id: string; status: LotStatus },
  can: { logLogs: boolean; manage: boolean },
): LotAction[] {
  if (lot.status === 'fermented') {
    return can.manage
      ? [
          {
            id: 'start-drying',
            label: 'Iniciar secado',
            href: startPath(lot.id),
            icon: Play,
          },
        ]
      : [];
  }
  if (lot.status !== 'drying') return [];
  return [
    can.logLogs && {
      id: 'record-log',
      label: 'Registrar bitácora',
      href: logPath(lot.id),
      icon: ClipboardPen,
    },
    can.manage && {
      id: 'finish-drying',
      label: 'Finalizar secado',
      href: finishPath(lot.id),
      icon: Flag,
    },
    can.logLogs && {
      id: 'see-in-drying',
      label: 'Ver en Secado',
      href: DRYING_PATH,
      icon: Sun,
    },
  ].filter((action): action is LotAction => action !== false);
}
