import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

// "Volver" explícito para una pantalla de un nivel más hondo, además de la ruta de arriba: en
// celular la ruta ocupa poco y esto es lo primero que se busca.
export function BackLink({
  href,
  children,
}: {
  href: string;
  children: string;
}) {
  return (
    <Link
      className="inline-flex min-h-11 items-center gap-2 rounded-md px-3 font-bold text-selva hover:bg-surface-alt focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-cobre"
      href={href}
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      {children}
    </Link>
  );
}
