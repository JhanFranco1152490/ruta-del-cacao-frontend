'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatWeekdayLongDate } from '@/lib/format/dates';

import type { ActivityOfDay } from '../activity-days';
import { ActivityCard } from './activity-card';

// Todas las actividades de un día, para cuando la celda del calendario no las muestra completas.
// Tocar una abre su detalle.
export function ActivityDayDialog({
  date,
  items,
  onClose,
  onSelect,
}: {
  date: string;
  items: readonly ActivityOfDay[];
  onClose: () => void;
  onSelect: (item: ActivityOfDay) => void;
}) {
  return (
    <Dialog onOpenChange={(open) => !open && onClose()} open>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="first-letter:uppercase">
            {formatWeekdayLongDate(date).replace(/ de \d{4}$/, '')}
          </DialogTitle>
          <DialogDescription>
            {items.length === 1 ? '1 actividad' : `${items.length} actividades`}
          </DialogDescription>
        </DialogHeader>
        <ul className="space-y-3">
          {items.map((item) => (
            <li key={item.activity.id}>
              <ActivityCard item={item} onSelect={() => onSelect(item)} />
            </li>
          ))}
        </ul>
        <DialogFooter>
          <Button onClick={onClose} variant="outline">
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
