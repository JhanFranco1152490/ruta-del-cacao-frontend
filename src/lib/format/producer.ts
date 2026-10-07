import type { components } from '@/lib/api/schema';

// Cómo se nombra al productor de un recurso (finca, parcela) a quien ve los de varios.
export type ProducerRef = components['schemas']['FarmProducer'];

export const producerLabelOf = (producer: ProducerRef) =>
  `${producer.first_name} ${producer.last_name} · ${producer.member_code}`;
