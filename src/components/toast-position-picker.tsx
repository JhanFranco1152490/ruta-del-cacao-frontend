'use client';

import type { ToastPosition } from '@/config/toast';
import { notify } from '@/lib/notify';

const OPTIONS: { label: string; value: ToastPosition }[] = [
  {
    label: 'Abajo a la derecha',
    value: { vertical: 'bottom', horizontal: 'right' },
  },
  {
    label: 'Abajo al centro',
    value: { vertical: 'bottom', horizontal: 'center' },
  },
  {
    label: 'Abajo a la izquierda',
    value: { vertical: 'bottom', horizontal: 'left' },
  },
  {
    label: 'Arriba a la derecha',
    value: { vertical: 'top', horizontal: 'right' },
  },
  {
    label: 'Arriba al centro',
    value: { vertical: 'top', horizontal: 'center' },
  },
  {
    label: 'Arriba a la izquierda',
    value: { vertical: 'top', horizontal: 'left' },
  },
];

const keyOf = ({ vertical, horizontal }: ToastPosition) =>
  `${vertical}-${horizontal}`;

// TEMPORAL: para probar la mejor posición de los avisos sobre cada pantalla. Solo existe con
// `next dev` (nunca en producción ni en las pruebas); elegida la posición, se borra este archivo y
// se fija el valor en `config/toast.ts`.
export function ToastPositionPicker({
  value,
  onChange,
}: {
  value: ToastPosition;
  onChange: (position: ToastPosition) => void;
}) {
  if (process.env.NODE_ENV !== 'development') return null;
  return (
    <label className="fixed top-1 left-1/2 z-[110] -translate-x-1/2 rounded-full bg-selva px-3 py-1 text-xs font-bold text-white shadow-card">
      <span className="mr-2">Posición de los avisos (solo desarrollo)</span>
      <select
        className="rounded bg-white px-1 text-selva"
        onChange={(event) => {
          const next = OPTIONS.find(
            ({ value: v }) => keyOf(v) === event.target.value,
          );
          if (!next) return;
          onChange(next.value);
          notify.success('Así se verá un aviso', {
            description: next.label,
          });
        }}
        value={keyOf(value)}
      >
        {OPTIONS.map(({ label, value: option }) => (
          <option key={keyOf(option)} value={keyOf(option)}>
            {label}
          </option>
        ))}
      </select>
    </label>
  );
}
