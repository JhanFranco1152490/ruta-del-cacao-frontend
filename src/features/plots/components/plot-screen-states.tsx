import { cn } from 'cn';
import { UnavailablePage } from '@/components/unavailable-page';
import { CircleOff } from 'lucide-react';
import Link from 'next/link';

import { CAPTURE_BUTTON_CLASS } from '@/components/capture-field-class';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { pageContainerClass } from '@/components/page-container';

export function PlotEditorSkeleton() {
  return (
    <div
      aria-label="Cargando parcela"
      className={pageContainerClass('wide', 'space-y-6')}
      role="status"
    >
      <Skeleton className="h-12 w-2/3" />
      <Skeleton className="h-96" />
    </div>
  );
}

export function PlotUnavailable({
  message,
  backHref,
}: {
  message: string;
  backHref: string;
}) {
  return (
    <UnavailablePage
      backHref={backHref}
      backLabel="Volver a la finca"
      message={message}
      title="No fue posible abrir la parcela"
    />
  );
}
