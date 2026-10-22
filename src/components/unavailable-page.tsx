import { cn } from 'cn';
import { CircleOff } from 'lucide-react';
import Link from 'next/link';

import { CAPTURE_BUTTON_CLASS } from '@/components/capture-field-class';
import { buttonVariants } from '@/components/ui/button';

// Una pantalla que no se pudo abrir (no existe, no se alcanza o no se pudo leer): por qué, y el
// camino de vuelta a donde sí se puede seguir.
export function UnavailablePage({
  title,
  message,
  backHref,
  backLabel,
}: {
  title: string;
  message: string;
  backHref: string;
  backLabel: string;
}) {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-16 text-center sm:px-8">
      <CircleOff aria-hidden="true" className="mx-auto size-10 text-err" />
      <h1 className="mt-4 text-3xl text-selva">{title}</h1>
      <p className="mt-3 text-muted-foreground" role="alert">
        {message}
      </p>
      <Link
        className={buttonVariants({
          size: 'office',
          className: cn(CAPTURE_BUTTON_CLASS, 'mt-6'),
        })}
        href={backHref}
      >
        {backLabel}
      </Link>
    </div>
  );
}
