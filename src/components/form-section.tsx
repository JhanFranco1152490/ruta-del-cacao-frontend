import type { ReactNode } from 'react';

export function FormSection({
  title,
  actions,
  children,
}: {
  title: ReactNode;
  // Controles de la sección, a la derecha del título.
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[var(--radius-card)] bg-card p-5 shadow-card">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-2xl text-selva">{title}</h2>
        {actions}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}
