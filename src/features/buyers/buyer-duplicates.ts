import type { Buyer, ExistingBuyer } from './api';
import { normalizeBuyerName } from './buyer-name';

type Known = Pick<
  Buyer,
  'id' | 'name' | 'document_type' | 'identity_document' | 'is_active'
>;

const asExisting = ({ id, name, is_active }: Known): ExistingBuyer => ({
  id,
  name,
  is_active,
});

// Otro comprador del directorio con el mismo tipo y número de documento, activo o inactivo. Se
// adelanta al servidor con la copia de la lista, pero es el servidor el que decide. `selfId` es el
// que se está editando, que no se cuenta a sí mismo.
export function sameDocumentBuyer(
  known: readonly Known[],
  documentType: string,
  identityDocument: string,
  selfId?: string,
): ExistingBuyer | null {
  const number = identityDocument.trim();
  if (!number) return null;
  const found = known.find(
    (buyer) =>
      buyer.id !== selfId &&
      buyer.document_type === documentType &&
      buyer.identity_document === number,
  );
  return found ? asExisting(found) : null;
}

// Otro comprador que se llama igual (sin mayúsculas, tildes, espacios, guiones ni puntos) pero con
// otro documento. Solo es un aviso: dos compradores distintos pueden llamarse igual.
export function sameNameBuyer(
  known: readonly Known[],
  name: string,
  selfId?: string,
): ExistingBuyer | null {
  const needle = normalizeBuyerName(name);
  if (!needle) return null;
  const found = known.find(
    (buyer) => buyer.id !== selfId && normalizeBuyerName(buyer.name) === needle,
  );
  return found ? asExisting(found) : null;
}
