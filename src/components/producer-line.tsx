import Link from 'next/link';

import { type ProducerRef, producerLabelOf } from '@/lib/format/producer';

// De quién es una finca o una parcela. Solo se muestra a quien no tiene un productor propio (la asociación y la
// cuenta técnica): para un productor sería su propio nombre en cada tarjeta. Es solo de lectura:
// nada cambia de dueño.
export function ProducerLine({
  producer,
  linkable = false,
}: {
  producer: ProducerRef;
  // Con permiso para consultar productores, el nombre lleva a su expediente.
  linkable?: boolean;
}) {
  const label = producerLabelOf(producer);
  return (
    <p className="text-sm text-muted-foreground">
      Productor:{' '}
      {linkable ? (
        <Link
          className="font-bold text-foreground underline underline-offset-4"
          href={`/productores/${producer.id}`}
        >
          {label}
        </Link>
      ) : (
        <strong className="text-foreground">{label}</strong>
      )}
    </p>
  );
}
