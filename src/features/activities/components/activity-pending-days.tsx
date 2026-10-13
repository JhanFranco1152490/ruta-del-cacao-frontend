import { useId } from 'react';

import { NativeSelect } from '@/components/ui/native-select';

import { PENDING_DAY_OPTIONS } from '../activity-pending';

// Cuántos días hacia adelante cuenta Pendientes, además de lo vencido, lo retrasado y lo de hoy.
export function ActivityPendingDays({
  days,
  onDays,
}: {
  days: number;
  onDays: (days: number) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center gap-2 text-sm">
      <label className="font-bold text-selva" htmlFor={id}>
        Mirar hacia adelante
      </label>
      <NativeSelect
        className="h-10 w-auto text-sm"
        id={id}
        onChange={(event) => onDays(Number(event.target.value))}
        value={days}
      >
        {PENDING_DAY_OPTIONS.map((option) => (
          <option key={option} value={option}>
            {option} días
          </option>
        ))}
      </NativeSelect>
    </div>
  );
}
