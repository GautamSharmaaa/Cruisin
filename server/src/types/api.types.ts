// Governed by .rules v1.0
export interface ApiEnvelope<TData> {
  success: boolean;
  data: TData;
  message: string;
  error?: string[];
}

export interface PaginationQuery {
  page: number;
  limit: number;
}

export interface PaginatedResult<TItem> {
  items: TItem[];
  total: number;
  page: number;
  pages: number;
}
