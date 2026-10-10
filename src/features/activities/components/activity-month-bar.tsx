import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { formatMonthYear } from '@/lib/format/dates';

// El mes que se ve, con sus flechas y la vuelta a hoy.
export function ActivityMonthBar({
  month,
  isCurrentMonth,
  onPrevious,
  onNext,
  onToday,
}: {
  month: string;
  isCurrentMonth: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        aria-label="Mes anterior"
        className="size-11"
        onClick={onPrevious}
        size="office"
        variant="outline"
      >
        <ChevronLeft aria-hidden="true" className="size-5" />
      </Button>
      <Button
        aria-label="Mes siguiente"
        className="size-11"
        onClick={onNext}
        size="office"
        variant="outline"
      >
        <ChevronRight aria-hidden="true" className="size-5" />
      </Button>
      {/* Cambia al navegar: se anuncia sin mover el foco de la flecha. */}
      <h2
        aria-live="polite"
        className="mx-2 text-2xl text-selva first-letter:uppercase"
      >
        {formatMonthYear(month)}
      </h2>
      <Button
        className="ml-auto"
        disabled={isCurrentMonth}
        onClick={onToday}
        size="office"
        variant="outline"
      >
        Hoy
      </Button>
    </div>
  );
}
