import type {
  Buyer,
  BuyerCreateRequest,
  BuyerType,
  BuyerUpdateRequest,
} from './api';
import type { BuyerFormInput, BuyerFormValues } from './buyer-schema';

// NIT por defecto: la mayoría de los compradores son empresas.
export const emptyBuyerForm: BuyerFormInput = {
  producer_id: '',
  name: '',
  document_type: 'NIT',
  identity_document: '',
  buyer_type: '',
  contact_name: '',
  phone: '',
  email: '',
};

export const toFormValues = (buyer: Buyer): BuyerFormInput => ({
  producer_id: buyer.producer.id,
  name: buyer.name,
  document_type: buyer.document_type,
  identity_document: buyer.identity_document,
  buyer_type: buyer.buyer_type,
  contact_name: buyer.contact_name ?? '',
  phone: buyer.phone ?? '',
  email: buyer.email ?? '',
});

// Lo que se guarda: sin espacios a los lados, los opcionales vacíos como null y el correo en
// minúsculas, como lo deja el servidor. Así se compara una edición con lo que ya está guardado.
const toSavedFields = (values: BuyerFormValues) => ({
  name: values.name.trim(),
  document_type: values.document_type,
  identity_document: values.identity_document.trim(),
  // El esquema ya rechazó el vacío.
  buyer_type: values.buyer_type as BuyerType,
  contact_name: values.contact_name.trim() || null,
  phone: values.phone.trim() || null,
  email: values.email.trim().toLowerCase() || null,
});

// `producer_id` solo viaja si lo eligió la cuenta técnica: para otra cuenta el servidor lo rechaza.
export const toCreateRequest = (
  values: BuyerFormValues,
): BuyerCreateRequest => ({
  ...toSavedFields(values),
  ...(values.producer_id ? { producer_id: values.producer_id } : {}),
});

// Solo lo que cambió, con la versión que se leyó. Sin cambios devuelve null: no se envía nada.
export function toUpdateRequest(
  values: BuyerFormValues,
  buyer: Buyer,
  expectedVersion = buyer.version,
): BuyerUpdateRequest | null {
  const changes = Object.fromEntries(
    Object.entries(toSavedFields(values)).filter(
      ([field, value]) => buyer[field as keyof Buyer] !== value,
    ),
  );
  if (Object.keys(changes).length === 0) return null;
  return { ...changes, expected_version: expectedVersion };
}
