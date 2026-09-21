export const documentTypes = ['CC', 'CE', 'PPT', 'NIT'] as const;

export type DocumentType = (typeof documentTypes)[number];
export type ProducerStatus = 'active' | 'inactive';

export type Municipality = {
  code: string;
  name: string;
};

export type Producer = {
  id: string;
  member_code: string;
  organization_id: string;
  document_type: DocumentType;
  identity_document: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  municipality_code: string;
  joined_on: string;
  status: ProducerStatus;
  version: number;
  created_at: string;
  updated_at: string;
};

export type ProducerListItem = Pick<
  Producer,
  | 'id'
  | 'member_code'
  | 'document_type'
  | 'identity_document'
  | 'first_name'
  | 'last_name'
  | 'municipality_code'
  | 'status'
>;

export type ProducerListResponse = {
  count: number;
  page: number;
  page_size: number;
  results: ProducerListItem[];
};

export type ProducerInput = {
  document_type: DocumentType;
  identity_document: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  municipality_code: string;
  joined_on: string;
};

export type ProducerListFilters = {
  search?: string;
  status?: ProducerStatus;
  municipalityCode?: string;
  page?: number;
  pageSize?: number;
};

export type ApiErrorBody = {
  code?: string;
  message?: string;
  fields?: Record<string, string[]>;
  existing_producer_id?: string;
};
