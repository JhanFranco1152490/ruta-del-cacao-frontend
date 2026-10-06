import Link from 'next/link';

import { type FarmProducer, producerLabelOf } from '../farm-list-item';

// De quién es la finca. Solo se muestra a quien no tiene un productor propio (la asociación y la
// cuenta técnica): para un productor sería su propio nombre en cada tarjeta. Es solo de lectura:
// una finca no cambia de dueño.
export function FarmProducerLine({
  producer,
  linkable = false,
}: {
  producer: FarmProducer;
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
