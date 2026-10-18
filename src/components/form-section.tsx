import { cn } from 'cn';
import type { ReactNode } from 'react';

export function FormSection({
  title,
  actions,
  compact = false,
  children,
}: {
  title: ReactNode;
  // Controles de la sección, a la derecha del título.
  actions?: ReactNode;
  // Para un formulario que comparte la pantalla en columnas: menos aire alrededor y entre el título
  // y los campos.
  compact?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={cn(
        'rounded-[var(--radius-card)] bg-card shadow-card',
        compact ? 'p-4' : 'p-5',
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className={cn('text-selva', compact ? 'text-xl' : 'text-2xl')}>
          {title}
        </h2>
        {actions}
      </div>
      <div className={compact ? 'mt-3' : 'mt-5'}>{children}</div>
    </section>
  );
}
