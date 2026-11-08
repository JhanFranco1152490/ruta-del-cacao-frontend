import type { Buyer } from './api';

// «NIT 900123456»: la sigla basta en una fila; el nombre completo del tipo va en el formulario.
export const documentText = (
  buyer: Pick<Buyer, 'document_type' | 'identity_document'>,
) => `${buyer.document_type} ${buyer.identity_document}`;

// Cómo se le habla: el teléfono y el correo que tenga, en una línea.
export const contactMeansText = (buyer: Pick<Buyer, 'phone' | 'email'>) =>
  [buyer.phone, buyer.email].filter(Boolean).join(' · ');

export const buyerCountText = (count: number) =>
  count === 1 ? '1 comprador' : `${count} compradores`;
