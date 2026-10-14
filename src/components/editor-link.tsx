'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';

import { useCurrentPath } from '@/hooks/use-current-path';
import { withOrigin } from '@/lib/navigation/origin';

// Un enlace que abre un editor (registrar, editar, caracterizar). Recuerda la pantalla desde la que
// se abre, con sus filtros y su página, para que el editor vuelva a ella al guardar o cancelar.
export function EditorLink({ href, ...props }: ComponentProps<typeof Link>) {
  const current = useCurrentPath();
  return (
    <Link
      href={typeof href === 'string' ? withOrigin(href, current) : href}
      {...props}
    />
  );
}
