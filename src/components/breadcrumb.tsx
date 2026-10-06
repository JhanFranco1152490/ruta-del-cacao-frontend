import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from 'cn';

export type Crumb = {
  label: string;
  // Sin dirección: el nivel no se puede abrir (o es el actual).
  href?: string;
};

// La ruta hasta la pantalla (Fincas / La Esperanza / Parcela P1): cada nivel superior lleva a su
// pantalla, así que se vuelve un nivel o varios sin pasar por el menú lateral. El último es donde
// se está.
export function Breadcrumb({ items }: { items: readonly Crumb[] }) {
  return (
    <nav aria-label="Ruta de navegación" className="text-sm">
      <ol className="flex flex-wrap items-center gap-1 text-muted-foreground">
        {items.map((item, index) => {
          const current = index === items.length - 1;
          return (
            <li
              className="flex min-w-0 items-center gap-1"
              key={`${index}-${item.label}`}
            >
              {index > 0 && (
                <ChevronRight aria-hidden="true" className="size-4 shrink-0" />
              )}
              {item.href && !current ? (
                <Link
                  className="block max-w-32 truncate underline underline-offset-4 hover:text-foreground sm:max-w-none"
                  title={item.label}
                  href={item.href}
                >
                  {item.label}
                </Link>
              ) : (
                <span
                  aria-current={current ? 'page' : undefined}
                  className={cn(
                    'block max-w-48 truncate sm:max-w-none',
                    current && 'font-bold text-foreground',
                  )}
                  title={item.label}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
