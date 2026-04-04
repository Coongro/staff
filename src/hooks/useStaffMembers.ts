/**
 * Hook para listar miembros del staff con búsqueda, filtros y paginación.
 */
import { getHostReact, actions } from '@coongro/plugin-sdk';

import type { StaffFilters, SortDirection } from '../types/filters.js';
import type { StaffMember } from '../types/staff-member.js';

const React = getHostReact();
const { useState, useEffect, useCallback, useRef } = React;

export interface UseStaffMembersOptions extends StaffFilters {
  pageSize?: number;
  autoFetch?: boolean;
}

export interface UseStaffMembersResult {
  data: StaffMember[];
  loading: boolean;
  error: string | null;
  filters: StaffFilters;
  setFilters: (filters: StaffFilters) => void;
  search: (query: string) => void;
  setSort: (orderBy: string, orderDir: SortDirection) => void;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  nextPage: () => void;
  prevPage: () => void;
  goToPage: (page: number) => void;
  refetch: () => Promise<void>;
}

export function useStaffMembers(options: UseStaffMembersOptions = {}): UseStaffMembersResult {
  const { pageSize: initialPageSize = 20, autoFetch = true, ...initialFilters } = options;

  const [data, setData] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<StaffFilters>(initialFilters);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(initialPageSize);
  const [total, setTotal] = useState(0);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await actions.execute<StaffMember[]>('staff.members.search', {
        ...filters,
        limit: pageSize,
        offset: (page - 1) * pageSize,
      });
      if (!mountedRef.current) return;
      setData(result);
      if (result.length < pageSize) {
        setTotal((page - 1) * pageSize + result.length);
      } else {
        setTotal(Math.max(total, page * pageSize + 1));
      }
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Error al cargar personal');
      setData([]);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [filters, page, pageSize]);

  useEffect(() => {
    if (autoFetch) {
      void fetch();
    }
  }, [fetch, autoFetch]);

  const search = useCallback((query: string) => {
    setFilters((prev) => ({ ...prev, query }));
    setPage(1);
  }, []);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const nextPage = useCallback(() => {
    setPage((p) => Math.min(p + 1, totalPages));
  }, [totalPages]);

  const prevPage = useCallback(() => {
    setPage((p) => Math.max(1, p - 1));
  }, []);

  const goToPage = useCallback(
    (p: number) => {
      setPage(Math.max(1, Math.min(p, totalPages)));
    },
    [totalPages]
  );

  const setSort = useCallback((orderBy: string, orderDir: SortDirection) => {
    setFilters((prev) => ({ ...prev, orderBy, orderDir }));
    setPage(1);
  }, []);

  return {
    data,
    loading,
    error,
    filters,
    setFilters: (f) => {
      setFilters(f);
      setPage(1);
    },
    search,
    setSort,
    pagination: { page, pageSize, total, totalPages },
    nextPage,
    prevPage,
    goToPage,
    refetch: fetch,
  };
}
