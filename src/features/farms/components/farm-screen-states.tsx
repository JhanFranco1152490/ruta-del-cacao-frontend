import { cn } from 'cn';
import { CircleOff } from 'lucide-react';
import Link from 'next/link';

import { CAPTURE_BUTTON_CLASS } from '@/components/capture-field-class';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export function FarmScreenSkeleton() {
  return (
    <div
      aria-label="Cargando finca"
      className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-8 sm:px-8"
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
    <div className="mx-auto w-full max-w-xl px-4 py-16 text-center sm:px-8">
      <CircleOff aria-hidden="true" className="mx-auto size-10 text-err" />
      <h1 className="mt-4 text-3xl text-selva">
        No fue posible abrir la finca
      </h1>
      <p className="mt-3 text-muted-foreground" role="alert">
        {message}
      </p>
      <Link
        className={buttonVariants({
          size: 'office',
          className: cn(CAPTURE_BUTTON_CLASS, 'mt-6'),
        })}
        href="/fincas"
      >
        Volver a mis fincas
      </Link>
    </div>
  );
}
