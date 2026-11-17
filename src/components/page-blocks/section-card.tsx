import { cn } from 'cn';
import { ChevronDown } from 'lucide-react';
import { type ReactNode, useId, useState } from 'react';

import { type ModuleAccent, accentStyle } from './accent';
import { SectionItem, type SectionPick } from './section-item';

// Un bloque de contenido: tarjeta blanca con un filete del acento arriba, su título,
// un contador y sus acciones. El filete se recorta con las esquinas (no es un borde), así que
// tiene el mismo grosor de punta a punta. Con `pick` la sección es una de varias que se eligen de una
// lista: como `item` es su renglón en ella y como `panel` es esta tarjeta, solo si es la elegida.
export function SectionCard({
  title,
  count,
  actions,
  accent,
  className,
  children,
  id,
  pick,
  collapsible = false,
  defaultOpen = true,
}: {
  title: string;
  count?: number;
  actions?: ReactNode;
  accent: ModuleAccent;
  className?: string;
  children: ReactNode;
  id?: string;
  pick?: SectionPick;
  // La persona puede plegarla desde su título: lo que no mira ahora no ocupa pantalla. Abre abierta
  // salvo que se diga lo contrario; al plegarla también se esconden sus acciones, que son del contenido.
  collapsible?: boolean;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const bodyId = useId();
  if (pick?.as === 'item') {
    return <SectionItem accent={accent} pick={pick} title={title} />;
  }
  if (pick?.as === 'panel' && !pick.selected) return null;
  const headingId = id ? `${id}-titulo` : undefined;
  const expanded = !collapsible || open;
  const heading = (
    <>
      {title}
      {count !== undefined && (
        <span className="rounded-full border border-border bg-muted px-2 font-sans text-xs font-bold text-muted-foreground">
          {count}
        </span>
      )}
    </>
  );
  return (
    <section
      aria-labelledby={headingId}
      aria-label={headingId ? undefined : title}
      className={cn(
        'motion-rise relative min-w-0 overflow-hidden rounded-[var(--radius-card)] bg-card p-4 pt-5 shadow-card before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-[var(--mod)] sm:p-5 sm:pt-6',
        className,
      )}
      style={accentStyle(accent)}
    >
      <div
        className={cn(
          'flex flex-wrap items-center justify-between gap-x-3 gap-y-2',
          expanded && 'mb-3',
        )}
      >
        <h2
          className="font-sans text-base font-extrabold text-selva"
          id={headingId}
        >
          {collapsible ? (
            <button
              aria-controls={bodyId}
              aria-expanded={open}
              className="-my-1 flex items-center gap-2 rounded-md py-1 text-left focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-cobre"
              onClick={() => setOpen((value) => !value)}
              type="button"
            >
              {heading}
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  'size-4 shrink-0 transition-transform',
                  !open && '-rotate-90',
                )}
              />
            </button>
          ) : (
            <span className="flex items-center gap-2">{heading}</span>
          )}
        </h2>
        {actions && (
          <div className="flex flex-wrap gap-2" hidden={!expanded}>
            {actions}
          </div>
        )}
      </div>
      <div hidden={!expanded} id={bodyId}>
        {children}
      </div>
    </section>
  );
}

// Datos de un registro en dos niveles: la etiqueta pequeña y tenue, el valor firme.
export function KeyValues({
  children,
  single = false,
}: {
  children: ReactNode;
  // Una sola columna: para una tarjeta angosta, donde dos partirían los valores largos.
  single?: boolean;
}) {
  return (
    <dl
      className={cn(
        'grid grid-cols-1 gap-x-5 gap-y-3',
        !single && 'min-[420px]:grid-cols-2',
      )}
    >
      {children}
    </dl>
  );
}

export function KeyValue({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="text-xs font-semibold text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 font-bold break-words text-foreground">
        {children}
      </dd>
    </div>
  );
}
