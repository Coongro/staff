/**
 * Acciones de staff: el contrato que el Core valida y expone.
 *
 * Cada acción declara qué acepta y delega en el repositorio. Un registro se
 * devuelve como objeto (o `null`), la búsqueda es una página (`pageInput` →
 * `{ items, total }`) y `list`, el equipo entero (las opciones de un selector),
 * un array.
 */

import {
  createInsertSchema,
  mutation,
  pageInput,
  query,
  z,
  type Page,
} from '@coongro/plugin-sdk/actions';

import {
  STAFF_SORTABLE,
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

/**
 * Una página: `query` sigue siendo el texto a buscar (o `search`) y los filtros
 * de igualdad llevan el nombre de su columna (`role`, `is_active`).
 */
const SearchInput = pageInput(
  {
    query: z.string().optional(),
    role: z.string().optional(),
    is_active: z.boolean().optional(),
  },
  { orderBy: [...STAFF_SORTABLE] }
);

export const staffActions = {
  /** El equipo entero: lo que listan los selectores de responsable. No crece con el uso. */
  list: query.handler(
    ({ context }): Promise<EnrichedStaffMemberRow[]> => context.repo(StaffMemberRepository).list()
  ),

  search: query
    .meta({ page: true })
    .input(SearchInput)
    .handler(({ input, context }): Promise<Page<EnrichedStaffMemberRow>> => {
      const { search, query: text, is_active, ...filters } = input;
      return context
        .repo(StaffMemberRepository)
        .searchPage({ ...filters, isActive: is_active, query: text ?? search });
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

  /**
   * El miembro vinculado al usuario de la sesión, o `null`. Solo lee: no vincula
   * (para eso está `linkCurrent`), por eso lo otorga el permiso de ver.
   */
  getCurrent: query.handler(({ context }) => context.repo(StaffMemberRepository).getCurrent()),

  /**
   * El miembro del usuario de la sesión, vinculándolo por email si todavía no
   * tiene uno y hay un único candidato. Es `mutation` porque escribe.
   */
  linkCurrent: mutation.handler(({ context }) => context.repo(StaffMemberRepository).linkCurrent()),

  listUsers: query.handler(({ context }) => context.repo(StaffMemberRepository).listUsers()),

  create: mutation
    .input(z.object({ data: StaffCreate }).strict())
    .handler(async ({ input, context }) => {
      const [created] = await context.repo(StaffMemberRepository).create(input);
      return created ?? null;
    }),

  update: mutation
    .input(z.object({ id: Id, data: StaffPatch }).strict())
    .handler(async ({ input, context }) => {
      const [updated] = await context.repo(StaffMemberRepository).update(input);
      return updated ?? null;
    }),

  linkUser: mutation
    .input(z.object({ id: Id, userId: UserId }).strict())
    .handler(async ({ input, context }) => {
      const [linked] = await context.repo(StaffMemberRepository).linkUser(input);
      return linked ?? null;
    }),

  unlinkUser: mutation.input(ById).handler(async ({ input, context }) => {
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
