import { Play, RotateCw, Thermometer, Flag } from 'lucide-react';

import type { LotAction } from '@/lib/lot-actions';
import type { LotStatus } from '@/lib/lot-status';

import { FERMENTATION_PATH, turnPath } from './fermentation-paths';

const startPath = (lotId: string) =>
  `${FERMENTATION_PATH}?${new URLSearchParams({ vista: 'listos', iniciar: lotId })}`;

const finishPath = (lotId: string) =>
  `${FERMENTATION_PATH}?${new URLSearchParams({ finalizar: lotId })}`;

// El botón de la cabecera de Lotes cuando se mira un estado: lleva a donde se trabaja ese estado.
// Generado: a los lotes listos para fermentar; En fermentación: a la pantalla de Fermentación. En
// los demás estados esta etapa no ofrece nada.
export function fermentationStageAction(
  status: LotStatus,
  can: { logTurns: boolean; manage: boolean },
): LotAction | null {
  if (status === 'generated' && can.manage) {
    return {
      id: 'start-fermentation',
      label: 'Iniciar fermentación',
      href: `${FERMENTATION_PATH}?${new URLSearchParams({ vista: 'listos' })}`,
      icon: Play,
    };
  }
  if (status === 'fermenting' && can.logTurns) {
    return {
      id: 'go-to-fermentation',
      label: 'Ir a Fermentación',
      href: FERMENTATION_PATH,
      icon: Thermometer,
    };
  }
  return null;
}

// Lo que ofrece la fermentación de un lote en su menú de Lotes. Registrar un volteo es una página
// de campo y va directo a ella; iniciar y finalizar son formularios de Fermentación, que se abren
// al llegar. Quien solo registra volteos no ve iniciar ni finalizar.
export function fermentationLotActions(
  lot: { id: string; status: LotStatus },
  can: { logTurns: boolean; manage: boolean },
): LotAction[] {
  if (lot.status === 'generated') {
    return can.manage
      ? [
          {
            id: 'start-fermentation',
            label: 'Iniciar fermentación',
            href: startPath(lot.id),
            icon: Play,
          },
        ]
      : [];
  }
  if (lot.status !== 'fermenting') return [];
  return [
    can.logTurns && {
      id: 'record-turn',
      label: 'Registrar volteo',
      href: turnPath(lot.id),
      icon: RotateCw,
    },
    can.manage && {
      id: 'finish-fermentation',
      label: 'Finalizar fermentación',
      href: finishPath(lot.id),
      icon: Flag,
    },
    can.logTurns && {
      id: 'see-in-fermentation',
      label: 'Ver en Fermentación',
      href: FERMENTATION_PATH,
      icon: Thermometer,
    },
  ].filter((action): action is LotAction => action !== false);
}
