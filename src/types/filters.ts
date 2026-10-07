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
  /** Columnas ordenables de `staff.members.search`. */
  orderBy?: 'name' | 'role' | 'is_active' | 'created_at';
  orderDir?: SortDirection;
}
