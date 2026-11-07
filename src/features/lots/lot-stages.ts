import {
  LOT_STATUS_ORDER,
  LOT_STATUSES,
  type LotStatus,
} from '@/lib/lot-status';

export type StageState = 'done' | 'current' | 'upcoming';

export type LotStage = { status: LotStatus; label: string; state: StageState };

const stage = (status: LotStatus, state: StageState): LotStage => ({
  status,
  label: LOT_STATUSES[status].label,
  state,
});

// Un lote solo se descarta después de evaluarlo: lo hecho llega hasta Evaluado y Descartado ocupa
// el lugar de lo que ya no va a pasar.
const DISCARDED_AFTER = 'evaluated';

// Las etapas del lote en el orden en que avanza, y en cuál va: las anteriores están hechas, la
// actual se trabaja y las siguientes esperan. Un lote solo avanza, nunca retrocede.
export function lotStages(current: LotStatus): LotStage[] {
  if (current === 'discarded') {
    const done = LOT_STATUS_ORDER.slice(
      0,
      LOT_STATUS_ORDER.indexOf(DISCARDED_AFTER) + 1,
    );
    return [
      ...done.map((status) => stage(status, 'done')),
      stage('discarded', 'current'),
    ];
  }
  const position = LOT_STATUS_ORDER.indexOf(current);
  return LOT_STATUS_ORDER.map((status, index) =>
    stage(
      status,
      index < position ? 'done' : index === position ? 'current' : 'upcoming',
    ),
  );
}

// «Etapa 2 de 7»: para pantallas angostas, donde las etiquetas no caben.
export const stagePosition = (current: LotStatus) => {
  const stages = lotStages(current);
  return {
    position: stages.findIndex(({ state }) => state === 'current') + 1,
    total: stages.length,
  };
};
