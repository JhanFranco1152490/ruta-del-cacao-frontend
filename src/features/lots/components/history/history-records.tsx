'use client';

import { ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';

import { Button } from '@/components/ui/button';

// Los registros de una etapa (los volteos, los días de secado), plegados bajo su resumen: la
// historia cuenta por dónde pasó el lote, y el detalle se abre solo si se busca. Tarjetas y no una
// tabla, para que en el celular no haya que desplazarse de lado.
export function HistoryRecords({
  label,
  records,
}: {
  // «Ver los 4 volteos»: lo que dice el botón cerrado.
  label: string;
  records: readonly { key: string; text: string }[];
}) {
  const [open, setOpen] = useState(false);
  const listId = useId();
  if (records.length === 0) return null;
  return (
    <div className="space-y-2">
      <Button
        aria-controls={listId}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        size="office"
        variant="action"
      >
        <ChevronDown
          aria-hidden="true"
          className={open ? 'size-4 rotate-180' : 'size-4'}
        />
        {open ? 'Ocultar' : label}
      </Button>
      <ul
        className="motion-stagger grid grid-cols-1 gap-2 sm:grid-cols-2"
        hidden={!open}
        id={listId}
      >
        {records.map((record) => (
          <li
            className="rounded-md border border-border bg-muted px-3 py-2 text-sm tabular-nums"
            key={record.key}
          >
            {record.text}
          </li>
        ))}
      </ul>
    </div>
  );
}
