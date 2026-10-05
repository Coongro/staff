/**
 * Acciones de staff: el contrato que el Core valida y expone.
 *
 * Cada acción declara qué acepta y delega en el repositorio. Un registro se
 * devuelve como objeto (no `[registro]`) y los listados paginables como
 * `{ items, total }`; los que todavía llaman como antes reciben la forma vieja
 * mientras la acción declare `legacy`.
 */

import { createInsertSchema, mutation, query, z, type Page } from '@coongro/plugin-sdk/actions';

import {
  StaffMemberRepository,
  type EnrichedStaffMemberRow,
} from './repositories/staff-member.repository.js';
import { staffMemberTable } from './schema/staff-member.js';

/** Lo que se escribe desde afuera. `created_at`/`updated_at` los pone el repositorio. */
const WRITABLE = {
  contact_id: true,
  role: true,
  specialty: true,
  license_number: true,
  is_active: true,
  user_id: true,
} as const;

const Metadata = { metadata: z.record(z.string(), z.unknown()).nullable().optional() };

const staffInsert = createInsertSchema(staffMemberTable);

/** Alta: lo escribible más un `id` opcional (si no viene, lo genera el repositorio). */
const StaffCreate = staffInsert
  .pick(WRITABLE)
  .extend({
    ...Metadata,
    id: z.guid().optional(),
    // La columna no tiene default: sin esto, un alta sin el campo fallaba en la base.
    is_active: z.boolean().default(true),
  })
  .strict();

const StaffPatch = staffInsert.pick(WRITABLE).extend(Metadata).partial().strict();

const Id = z.guid();
const ById = z.object({ id: Id }).strict();
const UserId = z.union([z.string(), z.number()]);

const SearchInput = z
  .object({
    query: z.string().optional(),
    role: z.string().optional(),
    isActive: z.boolean().optional(),
    limit: z.number().int().positive().optional(),
    offset: z.number().int().nonnegative().optional(),
    orderBy: z.string().optional(),
    orderDir: z.enum(['asc', 'desc']).optional(),
  })
  .strict();

export const staffActions = {
  list: query
    .meta({ legacy: 'items' })
    .handler(async ({ context }): Promise<Page<EnrichedStaffMemberRow>> => {
      const items = await context.repo(StaffMemberRepository).list();
      return { items, total: items.length };
    }),

  search: query
    .meta({ legacy: 'items' })
    .input(SearchInput)
    .handler(async ({ input, context }): Promise<Page<EnrichedStaffMemberRow>> => {
      return context.repo(StaffMemberRepository).searchPage(input);
    }),

  getById: query
    .input(ById)
    .handler(
      async ({ input, context }) =>
        (await context.repo(StaffMemberRepository).getById(input)) ?? null
    ),

  findByLicenseNumber: query
    .input(z.object({ licenseNumber: z.string() }).strict())
    .handler(
      async ({ input, context }) =>
        (await context.repo(StaffMemberRepository).findByLicenseNumber(input)) ?? null
    ),

  findByContactId: query
    .input(z.object({ contactId: z.string() }).strict())
    .handler(
      async ({ input, context }) =>
        (await context.repo(StaffMemberRepository).findByContactId(input)) ?? null
    ),

  getByUser: query
    .input(z.object({ userId: UserId }).strict())
    .handler(
      async ({ input, context }) =>
        (await context.repo(StaffMemberRepository).getByUser(input)) ?? null
    ),

  getCurrent: query.handler(({ context }) => context.repo(StaffMemberRepository).getCurrent()),

  listUsers: query.handler(({ context }) => context.repo(StaffMemberRepository).listUsers()),

  create: mutation
    .meta({ legacy: 'first' })
    .input(z.object({ data: StaffCreate }).strict())
    .handler(async ({ input, context }) => {
      const [created] = await context.repo(StaffMemberRepository).create(input);
      return created ?? null;
    }),

  update: mutation
    .meta({ legacy: 'first' })
    .input(z.object({ id: Id, data: StaffPatch }).strict())
    .handler(async ({ input, context }) => {
      const [updated] = await context.repo(StaffMemberRepository).update(input);
      return updated ?? null;
    }),

  linkUser: mutation
    .meta({ legacy: 'first' })
    .input(z.object({ id: Id, userId: UserId }).strict())
    .handler(async ({ input, context }) => {
      const [linked] = await context.repo(StaffMemberRepository).linkUser(input);
      return linked ?? null;
    }),

  unlinkUser: mutation
    .meta({ legacy: 'first' })
    .input(ById)
    .handler(async ({ input, context }) => {
      const [unlinked] = await context.repo(StaffMemberRepository).unlinkUser(input);
      return unlinked ?? null;
    }),

  delete: mutation
    .meta({ effect: 'destructive' })
    .input(ById)
    .handler(({ input, context }) => context.repo(StaffMemberRepository).delete(input)),
};

/** Para el cliente tipado: `actionsOf<StaffActions>('staff.members')`. */
export type StaffActions = typeof staffActions;
