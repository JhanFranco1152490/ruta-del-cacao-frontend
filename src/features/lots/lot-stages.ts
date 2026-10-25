import {
  LOT_STATUS_ORDER,
  LOT_STATUSES,
  type LotStatus,
} from '@/lib/lot-status';

export type StageState = 'done' | 'current' | 'upcoming';

export type LotStage = { status: LotStatus; label: string; state: StageState };

// Las etapas del lote en el orden en que avanza, y en cuál va: las anteriores están hechas, la
// actual se trabaja y las siguientes esperan. Un lote solo avanza, nunca retrocede.
export function lotStages(current: LotStatus): LotStage[] {
  const position = LOT_STATUS_ORDER.indexOf(current);
  return LOT_STATUS_ORDER.map((status, index) => ({
    status,
    label: LOT_STATUSES[status].label,
    state:
      index < position ? 'done' : index === position ? 'current' : 'upcoming',
  }));
}

// «Etapa 2 de 5»: para el celular, donde las cinco etiquetas no caben.
export const stagePosition = (current: LotStatus) => ({
  position: LOT_STATUS_ORDER.indexOf(current) + 1,
  total: LOT_STATUS_ORDER.length,
});
