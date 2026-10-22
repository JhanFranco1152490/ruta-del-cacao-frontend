import type { ReactNode } from 'react';
import { cn } from 'cn';

import type { ModuleAccent } from '@/components/page-blocks/accent';
import {
  DetailHero,
  type HeroTone,
} from '@/components/page-blocks/detail-hero';

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
  tone,
  accent = 'hoja',
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
  // Con un tono, el encabezado es un banner de color (`DetailHero`). Los formularios no lo pasan:
  // ahí la atención va a los campos.
  tone?: HeroTone;
  accent?: ModuleAccent;
}) {
  if (tone) {
    return (
      <DetailHero
        accent={accent}
        actions={actions}
        description={description}
        eyebrow={eyebrow}
        title={title}
        tone={tone}
      />
    );
  }
  return (
    <div
      className={cn(
        'mt-1 flex flex-row flex-wrap items-end justify-between gap-3',
        className,
      )}
    >
      <div>
        {eyebrow && <p className="section-label">{eyebrow}</p>}
        <h1 className="text-3xl text-selva">{title}</h1>
        {/* El subrayado cobre de la marca: separa el título de su descripción. */}
        <span
          aria-hidden="true"
          className="mt-2 block h-1 w-12 rounded-full bg-cobre"
        />
        {description && (
          <p className="mt-3 max-w-2xl text-muted-foreground">{description}</p>
        )}
      </div>
      {actions && (
        // Gap más corto en celular para que dos acciones quepan en una fila: cada fila de botones que
        // se evita ahorra alto de pantalla.
        <div className="flex flex-wrap gap-2 sm:gap-3 max-sm:[&>*]:px-3">
          {actions}
        </div>
      )}
    </div>
  );
}
