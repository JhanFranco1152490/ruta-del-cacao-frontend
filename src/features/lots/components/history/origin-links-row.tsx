import { cn } from 'cn';
import { CalendarDays, ShieldCheck, Wheat } from 'lucide-react';

import { EditorLink } from '@/components/editor-link';
import { buttonVariants } from '@/components/ui/button';

import type { OriginLinks } from '../../history/origin-links';

const LINK_CLASS = cn(
  buttonVariants({ size: 'office', variant: 'action' }),
  'h-10',
);

// Lo que pasó en la parcela antes de la cosecha no entra en la historia del lote (es de la parcela
// y de muchos lotes): se enlaza. Cada enlace llega solo si la cuenta puede abrir esa pantalla.
export function OriginLinksRow({ links }: { links: OriginLinks }) {
  const items = [
    { href: links.harvest, label: 'Ver la cosecha', icon: Wheat },
    {
      href: links.plotHealth,
      label: 'Sanidad de la parcela',
      icon: ShieldCheck,
    },
    {
      href: links.plotActivities,
      label: 'Actividades de la parcela',
      icon: CalendarDays,
    },
  ].filter((item): item is typeof item & { href: string } => !!item.href);
  if (items.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {items.map(({ href, label, icon: Icon }) => (
        <EditorLink className={LINK_CLASS} href={href} key={label}>
          <Icon aria-hidden="true" className="size-4" /> {label}
        </EditorLink>
      ))}
    </div>
  );
}
