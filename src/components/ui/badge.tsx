import { cva, type VariantProps } from 'class-variance-authority';
import type { ComponentProps } from 'react';
import { cn } from 'cn';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold',
  {
    variants: {
      variant: {
        ok: 'bg-ok-bg text-ok',
        warn: 'bg-warn-bg text-warn',
        err: 'bg-err-bg text-err',
        info: 'bg-info-bg text-info',
        'ok-solid': 'bg-ok-solid text-ok-solid-fg',
        'warn-solid': 'bg-warn-solid text-warn-solid-fg',
        'err-solid': 'bg-err-solid text-err-solid-fg',
        'info-solid': 'bg-info-solid text-info-solid-fg',
      },
    },
    defaultVariants: { variant: 'info' },
  },
);

function Badge({
  className,
  variant,
  ...props
}: ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
