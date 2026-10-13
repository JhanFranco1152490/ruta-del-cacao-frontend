import { ChevronLeft, ChevronRight } from 'lucide-react';

import { Button } from '@/components/ui/button';

// El periodo que se ve (un mes o una semana), con sus flechas y la vuelta a hoy.
export function ActivityPeriodBar({
  title,
  previousLabel,
  nextLabel,
  isCurrent,
  onPrevious,
  onNext,
  onToday,
}: {
  title: string;
  previousLabel: string;
  nextLabel: string;
  isCurrent: boolean;
  onPrevious: () => void;
  onNext: () => void;
  onToday: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <Button
        aria-label={previousLabel}
        className="size-10"
        onClick={onPrevious}
        size="office"
        variant="outline"
      >
        <ChevronLeft aria-hidden="true" className="size-5" />
      </Button>
      <Button
        aria-label={nextLabel}
        className="size-10"
        onClick={onNext}
        size="office"
        variant="outline"
      >
        <ChevronRight aria-hidden="true" className="size-5" />
      </Button>
      {/* Cambia al navegar: se anuncia sin mover el foco de la flecha. */}
      <h2
        aria-live="polite"
        className="mx-1 text-xl text-selva first-letter:uppercase"
      >
        {title}
      </h2>
      <Button
        className="h-10"
        disabled={isCurrent}
        onClick={onToday}
        size="office"
        variant="outline"
      >
        Hoy
      </Button>
    </div>
  );
}
