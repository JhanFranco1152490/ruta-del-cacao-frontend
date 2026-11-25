'use client';

import {
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryStates,
} from 'nuqs';

import { parseAsIsoDate } from '@/lib/navigation/iso-date-parser';

import type { AuditRecordType } from './api';
import { AUDIT_RECORD_TYPES } from './audit-record-types';
import { type AuditFilterValues, hasAuditFilters } from './audit-request';

// Un tipo o una fecha malformados (?tipo=zzz, ?desde=2026-02-30) cuentan como no puestos; un vacío
// (?usuario=), como ningún filtro.
const parsers = {
  producer: parseAsString,
  actor: parseAsString,
  recordType: parseAsStringLiteral(AUDIT_RECORD_TYPES),
  from: parseAsIsoDate,
  to: parseAsIsoDate,
  page: parseAsInteger.withDefault(1),
};

const urlKeys = {
  producer: 'productor',
  actor: 'usuario',
  recordType: 'tipo',
  from: 'desde',
  to: 'hasta',
  page: 'pagina',
};

// Los filtros y la página de la bitácora viven en la URL: el enlace se comparte y el botón atrás
// los respeta. Van en un solo estado para que cambiar un filtro y volver a la primera página sea
// una sola escritura.
export function useAuditFilters() {
  const [params, setParams] = useQueryStates(parsers, {
    urlKeys,
    clearOnDefault: true,
  });
  const values: AuditFilterValues = {
    producer: params.producer || null,
    actor: params.actor || null,
    recordType: params.recordType,
    from: params.from,
    to: params.to,
    page: Math.max(1, params.page),
  };

  return {
    values,
    hasFilters: hasAuditFilters(values),
    setActor: (actor: string | null) => setParams({ actor, page: null }),
    setRecordType: (recordType: AuditRecordType | null) =>
      setParams({ recordType, page: null }),
    // El campo de fecha vacío llega como texto vacío.
    setFrom: (from: string) => setParams({ from: from || null, page: null }),
    setTo: (to: string) => setParams({ to: to || null, page: null }),
    setPage: (page: number) => setParams({ page }),
    // Las cuentas del productor anterior no son de este.
    setProducer: (producer: string | null) =>
      setParams({ producer, actor: null, page: null }),
    // Limpiar deja el productor: es a quién se mira, no un filtro.
    clear: () =>
      setParams({
        actor: null,
        recordType: null,
        from: null,
        to: null,
        page: null,
      }),
  };
}
