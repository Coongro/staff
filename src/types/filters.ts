/**
 * Filtros para búsqueda de miembros del staff.
 */
export type SortDirection = 'asc' | 'desc';

export interface StaffFilters {
  query?: string;
  role?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDir?: SortDirection;
}
