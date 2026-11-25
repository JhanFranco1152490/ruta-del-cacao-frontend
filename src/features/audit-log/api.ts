import type { components } from '@/lib/api/schema';

type Schemas = components['schemas'];

export type AuditEntry = Schemas['AuditEntry'];
export type AuditChange = Schemas['AuditChange'];
export type AuditRecord = Schemas['AuditRecord'];
export type AuditActor = Schemas['AuditActor'];
export type AuditOptions = Schemas['AuditOptions'];
export type AuditOptionActor = Schemas['AuditOptionActor'];
export type AuditRecordTypeOption = Schemas['AuditRecordTypeOption'];
export type AuditEntryPage = Schemas['PaginatedAuditEntryList'];
export type AuditRecordType = Schemas['AuditRecordTypeEnum'];
export type AuditValueKind = Schemas['AuditValueKindEnum'];
export type AuditHiddenReason = Schemas['AuditHiddenReasonEnum'];
// El esquema trae `before` y `after` sin tipo, porque el servidor los guarda como JSON. Llegan como
// texto, número o verdadero/falso según `kind`, y `null` en el lado que no aplica (el anterior de
// un alta, el nuevo de una eliminación) o cuando `hidden` dice por qué no se muestran.
export type AuditValue = string | number | boolean | null;
