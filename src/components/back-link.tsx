import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

export function BackLink({
  href,
  children,
}: {
  href: string;
  children: ReactNode;
}) {
  return (
    <Link
      className="inline-flex items-center gap-2 text-sm font-extrabold text-selva hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-selva"
      href={href}
    >
      <ArrowLeft aria-hidden="true" className="size-4" />
      {children}
    </Link>
  );
}
