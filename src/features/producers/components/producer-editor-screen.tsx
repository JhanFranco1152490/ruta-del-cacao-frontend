'use client';

import { ProducerForm } from './producer-form';
import { ProducerLoadGate } from './producer-load-gate';

// Sin revalidación automática: el formulario se inicializa una sola vez con esta lectura, y
// volver a pedir la ficha (foco, reconexión) solo produciría datos que el formulario no adopta.
const EDITOR_QUERY_OPTIONS = { staleTime: Infinity };

export function ProducerEditorScreen({ id }: { id: string }) {
  return (
    <ProducerLoadGate id={id} options={EDITOR_QUERY_OPTIONS}>
      {(producer) => <ProducerForm producer={producer} />}
    </ProducerLoadGate>
  );
}
