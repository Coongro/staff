/**
 * Hook para obtener un miembro del staff individual por ID.
 */
import { getHostReact, actions } from '@coongro/plugin-sdk';

import type { StaffMember } from '../types/staff-member.js';

const React = getHostReact();
const { useState, useEffect, useCallback, useRef } = React;

export interface UseStaffMemberResult {
  member: StaffMember | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

export function useStaffMember(id: string | null | undefined): UseStaffMemberResult {
  const [member, setMember] = useState<StaffMember | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const fetch = useCallback(async () => {
    if (!id) {
      setMember(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const result = await actions.execute<StaffMember | undefined>('staff.members.getById', {
        id,
      });
      if (!mountedRef.current) return;
      setMember(result ?? null);
    } catch (err) {
      if (!mountedRef.current) return;
      setError(err instanceof Error ? err.message : 'Error al cargar miembro del staff');
      setMember(null);
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void fetch();
  }, [fetch]);

  return { member, loading, error, refetch: fetch };
}
