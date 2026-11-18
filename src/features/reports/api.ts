import type { components, operations } from '@/lib/api/schema';

type Schemas = components['schemas'];
type QueryOf<Operation extends keyof operations> = NonNullable<
  operations[Operation]['parameters']['query']
>;

export type Report = Schemas['Report'];
export type ReportColumn = Schemas['ReportColumn'];
export type ReportTotal = Schemas['ReportTotal'];
export type ReportFilter = Schemas['ReportFilter'];
export type ReportCellKind = Schemas['ReportCellKindEnum'];
// Una celda: kg y porcentajes como texto decimal, pesos y conteos como enteros, y `null` sin dato.
export type ReportCell = Report['rows'][number][string];

export type ProducerReportType = QueryOf<'reports_producer_retrieve'>['type'];
export type AssociationReportType =
  QueryOf<'reports_association_retrieve'>['type'];
export type ReportType = ProducerReportType | AssociationReportType;
export type ReportFileFormat =
  QueryOf<'reports_producer_export_retrieve'>['file'];

export const REPORT_ERROR = {
  tooLarge: 'report_too_large',
  empty: 'report_empty',
} as const;
