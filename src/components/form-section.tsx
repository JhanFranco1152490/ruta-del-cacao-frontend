import type { ReactNode } from 'react';

export function FormSection({
  title,
  children,
}: {
  title: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[var(--radius-card)] bg-card p-5 shadow-card">
      <h2 className="text-2xl text-selva">{title}</h2>
      <div className="mt-5">{children}</div>
    </section>
  );
}
