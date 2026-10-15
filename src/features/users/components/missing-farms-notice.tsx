'use client';
import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAccounts } from '../api';

// Cuántos empleados de campo no tienen finca: sin ella no ven ni registran nada. Le avisa al
// Productor, que es quien las asigna, y lleva a la lista de los que faltan.
export function MissingFarmsNotice({ onShow }: { onShow: () => void }) {
  const missing = useAccounts({ without_farm: true, page: 1 });
  const count = missing.data?.count ?? 0;
  if (!count) return null;
  return (
    <div
      role="status"
      className="mt-6 flex flex-wrap items-center gap-3 rounded-lg bg-warn-bg p-4 text-warn"
    >
      <TriangleAlert aria-hidden="true" className="size-5 shrink-0" />
      <p className="flex-1">
        {count === 1
          ? '1 empleado no tiene finca asignada: no ve ni registra nada de campo.'
          : `${count} empleados no tienen finca asignada: no ven ni registran nada de campo.`}
      </p>
      <Button variant="outline" onClick={onShow}>
        Ver cuáles
      </Button>
    </div>
  );
}
