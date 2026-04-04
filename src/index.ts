/**
 * @coongro/staff — Entry point principal (browser-safe)
 *
 * Exportar aquí: hooks, componentes, tipos, utilidades.
 * NO exportar schema tables ni repositories (usan drizzle-orm, solo backend).
 * Para exports server-only → usar server.ts
 */

// Types
export type { StaffMemberRow, NewStaffMemberRow } from './schema/staff-member.js';
export type {
  SearchParams,
  EnrichedStaffMemberRow,
} from './repositories/staff-member.repository.js';
export type {
  StaffMember,
  StaffMemberCreateData,
  StaffMemberUpdateData,
} from './types/staff-member.js';
export type { StaffFilters, SortDirection } from './types/filters.js';
export type { StaffPickerProps, StaffBadgeProps } from './types/components.js';

// Hooks
export { useStaffMembers } from './hooks/useStaffMembers.js';
export type { UseStaffMembersOptions, UseStaffMembersResult } from './hooks/useStaffMembers.js';
export { useStaffMember } from './hooks/useStaffMember.js';
export type { UseStaffMemberResult } from './hooks/useStaffMember.js';
export { useStaffMutations } from './hooks/useStaffMutations.js';
export type { UseStaffMutationsResult } from './hooks/useStaffMutations.js';

// Components
export { StaffPicker } from './components/StaffPicker.js';
export { StaffBadge } from './components/StaffBadge.js';

// Utils
export { getInitials, getAvatarColor, formatStaffSubtitle } from './lib/avatar.js';
