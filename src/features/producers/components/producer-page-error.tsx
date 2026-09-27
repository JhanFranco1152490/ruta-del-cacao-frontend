import { CircleOff } from 'lucide-react';
import Link from 'next/link';

import { buttonVariants } from '@/components/ui/button';

export function ProducerPageError({ message }: { message: string }) {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-16 text-center sm:px-8">
      <CircleOff aria-hidden="true" className="mx-auto size-10 text-err" />
      <h1 className="mt-4 text-3xl text-selva">
        No fue posible abrir la ficha
      </h1>
      <p className="mt-3 text-muted-foreground" role="alert">
        {message}
      </p>
      <Link
        className={buttonVariants({ size: 'office', className: 'mt-6 px-4' })}
        href="/productores"
      >
        Volver a productores
      </Link>
    </div>
  );
}
