import { useId, type ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';
import { cn } from 'cn';

// Un grupo de una lista que se pliega desde su título. El contenido no se monta mientras está
// plegado.
export function CollapsibleGroup({
  title,
  meta,
  open,
  onToggle,
  children,
}: {
  title: string;
  meta?: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  const bodyId = useId();
  return (
    <section className="rounded-lg border border-border">
      <h2>
        <button
          type="button"
          aria-expanded={open}
          aria-controls={bodyId}
          onClick={onToggle}
          className="flex min-h-11 w-full items-center gap-3 rounded-lg px-4 py-2 text-left font-serif text-xl text-selva hover:bg-surface-alt focus-visible:outline-3 focus-visible:outline-offset-2 focus-visible:outline-cobre"
        >
          <ChevronDown
            aria-hidden
            className={cn(
              'size-5 shrink-0 transition-transform',
              !open && '-rotate-90',
            )}
          />
          <span className="min-w-0 break-words">{title}</span>
          {meta && (
            <span className="ml-auto shrink-0 font-sans text-sm text-muted-foreground">
              {meta}
            </span>
          )}
        </button>
      </h2>
      {open && (
        <div id={bodyId} className="px-2 pb-4">
          {children}
        </div>
      )}
    </section>
  );
}
