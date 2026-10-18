import type { AssignedCode } from '@/lib/offline/adapters';

import { farmLabel, plotLabel } from './place-label';

type Assigned = Pick<AssignedCode, 'code' | 'name'>;

const WORDS = {
  farm: { one: 'La finca', unnamed: 'La finca nueva', many: 'fincas' },
  plot: { one: 'La parcela', unnamed: 'La parcela nueva', many: 'parcelas' },
  // Un lote se reconoce por su código: no tiene nombre.
  lot: { one: 'El lote', unnamed: 'El lote', many: 'lotes' },
} as const;

const listOf = (items: readonly string[]) =>
  items.length === 1
    ? items[0]
    : `${items.slice(0, -1).join(', ')} y ${items[items.length - 1]}`;

// El aviso del código que el servidor dio a lo que se creó en el dispositivo (finca, parcela o lote). Sin él, el código
// aparece en la lista sin que nadie lo note. Varios de una tanda van en un solo aviso.
export function assignedCodeNotice(
  kind: AssignedCode['kind'],
  assigned: readonly Assigned[],
) {
  const words = WORDS[kind];
  if (assigned.length === 1) {
    const [{ code, name }] = assigned;
    const subject = name?.trim()
      ? `${words.one} ${name.trim()}`
      : words.unnamed;
    return `${subject} quedó con el código ${code}`;
  }
  const label = {
    farm: farmLabel,
    plot: plotLabel,
    lot: ({ code }: Assigned) => code,
  }[kind];
  return `${assigned.length} ${words.many} recibieron su código: ${listOf(assigned.map(label))}`;
}
