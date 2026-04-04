/**
 * Exportaciones server-only (drizzle-orm, repositories, schema tables).
 * NO importar desde el browser — usar '@coongro/staff' (entry principal) para hooks/componentes.
 */

export { staffMemberTable } from './schema/staff-member.js';
export type { StaffMemberRow, NewStaffMemberRow } from './schema/staff-member.js';
export { StaffMemberRepository } from './repositories/staff-member.repository.js';
export type {
  SearchParams,
  EnrichedStaffMemberRow,
} from './repositories/staff-member.repository.js';
