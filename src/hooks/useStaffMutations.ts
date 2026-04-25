/**
 * Hook para operaciones de mutación de miembros del staff (crear, editar, eliminar).
 */
import { getHostReact, actions, usePlugin } from '@coongro/plugin-sdk';

import type {
  StaffMember,
  StaffMemberCreateData,
  StaffMemberUpdateData,
} from '../types/staff-member.js';

const React = getHostReact();
const { useState, useCallback } = React;

export interface UseStaffMutationsResult {
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  create: (data: StaffMemberCreateData) => Promise<StaffMember | null>;
  update: (id: string, data: StaffMemberUpdateData) => Promise<StaffMember | null>;
  remove: (id: string) => Promise<boolean>;
}

export function useStaffMutations(): UseStaffMutationsResult {
  const { toast } = usePlugin();
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const create = useCallback(
    async (data: StaffMemberCreateData): Promise<StaffMember | null> => {
      setCreating(true);
      try {
        const result = await actions.execute<StaffMember[]>('staff.members.create', { data });
        toast.success('Personal creado', '');
        return result[0] ?? null;
      } catch (err) {
        toast.error('Error', err instanceof Error ? err.message : 'No se pudo crear');
        return null;
      } finally {
        setCreating(false);
      }
    },
    [toast]
  );

  const update = useCallback(
    async (id: string, data: StaffMemberUpdateData): Promise<StaffMember | null> => {
      setUpdating(true);
      try {
        const result = await actions.execute<StaffMember[]>('staff.members.update', { id, data });
        toast.success('Personal actualizado', '');
        return result[0] ?? null;
      } catch (err) {
        toast.error('Error', err instanceof Error ? err.message : 'No se pudo actualizar');
        return null;
      } finally {
        setUpdating(false);
      }
    },
    [toast]
  );

  const remove = useCallback(
    async (id: string): Promise<boolean> => {
      setDeleting(true);
      try {
        await actions.execute('staff.members.delete', { id });
        toast.success('Personal eliminado', '');
        return true;
      } catch (err) {
        toast.error('Error', err instanceof Error ? err.message : 'No se pudo eliminar');
        return false;
      } finally {
        setDeleting(false);
      }
    },
    [toast]
  );

  return { creating, updating, deleting, create, update, remove };
}
