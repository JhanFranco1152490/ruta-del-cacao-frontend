import { Pencil } from 'lucide-react';

// «Cambiado»: un valor distinto del predeterminado. Ícono y texto, nunca solo color.
export function ChangedMark() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-info-bg px-2 py-0.5 text-xs font-bold text-info">
      <Pencil aria-hidden="true" className="size-3" />
      Cambiado
    </span>
  );
}
