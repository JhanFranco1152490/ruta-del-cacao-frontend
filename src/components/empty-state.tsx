import type { ReactNode } from 'react';

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="p-10 text-center">
      <h2 className="text-2xl text-selva">{title}</h2>
      {description && (
        <p className="mx-auto mt-2 max-w-md text-muted-foreground">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
