import { cn } from 'cn';
import { UnavailablePage } from '@/components/unavailable-page';
import { CircleOff } from 'lucide-react';
import Link from 'next/link';

import { CAPTURE_BUTTON_CLASS } from '@/components/capture-field-class';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { pageContainerClass } from '@/components/page-container';

export function FarmScreenSkeleton() {
  return (
    <div
      aria-label="Cargando finca"
      className={pageContainerClass('wide', 'space-y-6')}
      role="status"
    >
      <Skeleton className="h-12 w-2/3" />
      <Skeleton className="h-28" />
      <Skeleton className="h-72" />
    </div>
  );
}

export function FarmUnavailable({ message }: { message: string }) {
  return (
    <UnavailablePage
      backHref="/fincas"
      backLabel="Volver a mis fincas"
      message={message}
      title="No fue posible abrir la finca"
    />
  );
}
