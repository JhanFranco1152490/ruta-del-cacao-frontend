import { cn } from 'cn';

export function FormMessage({
  variant = 'error',
  children,
}: {
  variant?: 'error' | 'success';
  children?: string;
}) {
  if (!children) return null;
  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={cn(
        'rounded-md border px-4 py-3 text-sm leading-6',
        variant === 'error'
          ? 'border-err/30 bg-err-bg text-err'
          : 'border-ok/30 bg-ok-bg text-ok',
      )}
    >
      {children}
    </div>
  );
}
