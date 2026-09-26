import type { ReactNode } from 'react';
import { cn } from 'cn';

import { Button } from '@/components/ui/button';
import { FOCUS_OUTLINE_CLASS } from '@/components/ui/focus-outline';

export function SubmitButton({
  pending,
  children,
  pendingLabel = 'Procesando…',
  className,
}: {
  pending: boolean;
  children: ReactNode;
  pendingLabel?: string;
  className?: string;
}) {
  return (
    <Button
      type="submit"
      disabled={pending}
      className={cn(
        'h-12 w-full gap-3 rounded-md px-5 text-base font-bold disabled:cursor-not-allowed disabled:opacity-70',
        FOCUS_OUTLINE_CLASS,
        className,
      )}
    >
      {pending && (
        <span
          className="size-4 animate-spin rounded-full border-2 border-primary-foreground/40 border-t-primary-foreground"
          aria-hidden="true"
        />
      )}
      {pending ? pendingLabel : children}
    </Button>
  );
}
