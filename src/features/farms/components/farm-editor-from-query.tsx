'use client';

import { useSearchParams } from 'next/navigation';

import { ErrorState } from '@/components/error-state';

import { FarmEditorScreen } from './farm-editor-screen';

export function FarmEditorFromQuery() {
  const id = useSearchParams().get('id');
  if (!id) return <ErrorState message="No se indicó qué finca editar." />;
  // `key`: cambiar de finca sin salir de la página monta un editor nuevo, sin datos de la otra.
  return <FarmEditorScreen id={id} key={id} />;
}
