import { cn } from 'cn';
import type { ReactNode } from 'react';

// El resultado de un formulario, en caja: por qué no se guardó (o que sí, en los de acceso).
export function FormMessage({
  variant = 'error',
  className,
  children,
}: {
  variant?: 'error' | 'success';
  className?: string;
  children?: ReactNode;
}) {
  if (!children) return null;
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={cn(
        'rounded-(--radius) px-4 py-3 text-sm font-bold',
        variant === 'error' ? 'bg-err-bg text-err' : 'bg-ok-bg text-ok',
        className,
      )}
    >
      {children}
    </div>
  );
}

// Un error de una línea, sin caja: el de un diálogo o el de un grupo de campos.
export function InlineError({
  className,
  children,
}: {
  className?: string;
  children?: ReactNode;
}) {
  if (!children) return null;
  return (
    <p className={cn('text-sm font-bold text-err', className)} role="alert">
      {children}
    </p>
  );
}
