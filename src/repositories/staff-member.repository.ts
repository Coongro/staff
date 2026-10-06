import { contactTable } from '@coongro/contacts/server';
import type { ModuleDatabaseAPI } from '@coongro/plugin-sdk';
import type { PluginContext } from '@coongro/plugin-sdk/server';
import { eq, and, or, ilike, asc, desc, sql, isNull, isNotNull, type SQL } from 'drizzle-orm';

import { staffMemberTable } from '../schema/staff-member.js';
import type { StaffMemberRow, NewStaffMemberRow } from '../schema/staff-member.js';

export interface SearchParams {
  query?: string;
  role?: string;
  isActive?: boolean;
  limit?: number;
  offset?: number;
  orderBy?: string;
  orderDir?: 'asc' | 'desc';
}

/** Fila enriquecida con datos del contacto vinculado */
export interface EnrichedStaffMemberRow extends StaffMemberRow {
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  contact_avatar_url: string | null;
}

/** Columnas del miembro más los datos de su contacto (nombre, email, teléfono, avatar). */
const ENRICHED_COLUMNS = {
  id: staffMemberTable.id,
  contact_id: staffMemberTable.contact_id,
  role: staffMemberTable.role,
  specialty: staffMemberTable.specialty,
  license_number: staffMemberTable.license_number,
  is_active: staffMemberTable.is_active,
  metadata: staffMemberTable.metadata,
  user_id: staffMemberTable.user_id,
  created_at: staffMemberTable.created_at,
  updated_at: staffMemberTable.updated_at,
  contact_name: contactTable.name,
  contact_email: contactTable.email,
  contact_phone: contactTable.phone,
  contact_avatar_url: contactTable.avatar_url,
};

/** `contact_id` es texto y `contacts.id` uuid: se compara como texto. */
const CONTACT_JOIN = eq(staffMemberTable.contact_id, sql`${contactTable.id}::text`);

/** Lo que usa el repositorio del contexto del plugin (`PluginContext`). */
export type StaffRepositoryContext = Pick<PluginContext, 'users'>;

export class StaffMemberRepository {
  constructor(
    private readonly db: ModuleDatabaseAPI,
    private readonly context: StaffRepositoryContext
  ) {}

  // ---------------------------------------------------------------------------
  // CRUD base
  // ---------------------------------------------------------------------------

  /**
   * Todos los miembros, con los datos de su contacto como en `search` y `getById`
   * (`contact_name`, `contact_email`, `contact_phone`, `contact_avatar_url`). Es un
   * superconjunto de las columnas de antes: quien solo leía `id` o `contact_id` no
   * cambia. Sin orden ni paginación, como siempre.
   */
  async list(): Promise<EnrichedStaffMemberRow[]> {
    return this.db.ormQuery((tx) =>
      tx.select(ENRICHED_COLUMNS).from(staffMemberTable).leftJoin(contactTable, CONTACT_JOIN)
    ) as Promise<EnrichedStaffMemberRow[]>;
  }

  async getById({ id }: { id: string }): Promise<EnrichedStaffMemberRow | undefined> {
    const rows = await this.db.ormQuery((tx) =>
      tx
        .select(ENRICHED_COLUMNS)
        .from(staffMemberTable)
        .leftJoin(contactTable, CONTACT_JOIN)
        .where(eq(staffMemberTable.id, id))
        .limit(1)
    );
    return rows[0] as EnrichedStaffMemberRow | undefined;
  }

  /** Sin `id`, lo genera acá. */
  async create({
    data,
  }: {
    data: Omit<NewStaffMemberRow, 'id'> & { id?: string };
  }): Promise<StaffMemberRow[]> {
    const id = data.id ?? crypto.randomUUID();
    const fullData = data as StaffMemberRow;
    if (fullData.user_id) await this.assertUserFree(String(fullData.user_id));
    const licenseNumber = fullData.license_number;

    // Validar matrícula única entre activos
    if (licenseNumber) {
      const existing = await this.findByLicenseNumber({ licenseNumber });
      if (existing && existing.is_active) {
        throw conflict(`Ya existe un miembro activo con matrícula ${licenseNumber}`);
      }
    }

    return this.db.ormQuery((tx) =>
      tx
        .insert(staffMemberTable)
        .values({ ...data, id })
        .returning()
    );
  }

  async update({
    id,
    data,
  }: {
    id: string;
    data: Partial<StaffMemberRow>;
  }): Promise<StaffMemberRow[]> {
    const licenseNumber = data.license_number;
    if (data.user_id) await this.assertUserFree(String(data.user_id), id);

    // Validar matrícula única si se está cambiando
    if (licenseNumber) {
      const existing = await this.findByLicenseNumber({ licenseNumber });
      if (existing && existing.id !== id && existing.is_active) {
        throw conflict(`Ya existe un miembro activo con matrícula ${licenseNumber}`);
      }
    }

    return this.db.ormQuery((tx) =>
      tx
        .update(staffMemberTable)
        .set({ ...data, updated_at: new Date().toISOString() } as Partial<StaffMemberRow>)
        .where(eq(staffMemberTable.id, id))
        .returning()
    );
  }

  async delete({ id }: { id: string }): Promise<void> {
    await this.db.ormQuery((tx) => tx.delete(staffMemberTable).where(eq(staffMemberTable.id, id)));
  }

  // ---------------------------------------------------------------------------
  // Search (con join a contacts para buscar por nombre)
  // ---------------------------------------------------------------------------

  async search({
    query,
    role,
    isActive,
    limit,
    offset,
    orderBy: orderByField,
    orderDir = 'asc',
  }: SearchParams): Promise<EnrichedStaffMemberRow[]> {
    return this.db.ormQuery((tx) => {
      const conditions = searchConditions({ query, role, isActive });

      let q = tx
        .select(ENRICHED_COLUMNS)
        .from(staffMemberTable)
        .leftJoin(contactTable, CONTACT_JOIN)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(searchOrder(orderByField, orderDir))
        .$dynamic();
      if (limit) q = q.limit(limit);
      if (offset) q = q.offset(offset);

      return q;
    }) as Promise<EnrichedStaffMemberRow[]>;
  }

  // ---------------------------------------------------------------------------
  // Validación
  // ---------------------------------------------------------------------------

  async findByLicenseNumber({
    licenseNumber,
  }: {
    licenseNumber: string;
  }): Promise<StaffMemberRow | undefined> {
    const rows = await this.db.ormQuery((tx) =>
      tx
        .select()
        .from(staffMemberTable)
        .where(
          and(
            eq(staffMemberTable.license_number, licenseNumber),
            eq(staffMemberTable.is_active, true)
          )
        )
        .limit(1)
    );
    return rows[0];
  }

  async findByContactId({ contactId }: { contactId: string }): Promise<StaffMemberRow | undefined> {
    const rows = await this.db.ormQuery((tx) =>
      tx.select().from(staffMemberTable).where(eq(staffMemberTable.contact_id, contactId)).limit(1)
    );
    return rows[0];
  }

  // ---------------------------------------------------------------------------
  // Vínculo con usuarios del tenant («Asignadas a mí»)
  // ---------------------------------------------------------------------------

  /** El miembro vinculado a un usuario, con los datos de su contacto. */
  async getByUser({
    userId,
  }: {
    userId: string | number;
  }): Promise<EnrichedStaffMemberRow | undefined> {
    const rows = await this.db.ormQuery((tx) =>
      tx
        .select(ENRICHED_COLUMNS)
        .from(staffMemberTable)
        .leftJoin(contactTable, CONTACT_JOIN)
        .where(eq(staffMemberTable.user_id, String(userId)))
        .limit(1)
    );
    return rows[0] as EnrichedStaffMemberRow | undefined;
  }

  /**
   * El miembro del usuario de la sesión. Si todavía no hay uno vinculado y existe
   * un único miembro sin usuario cuyo contacto tiene el mismo email, lo vincula
   * (así «Mías» funciona sin configurar nada cuando los datos coinciden). Sin
   * sesión o sin coincidencia devuelve `null`. Puede escribir: es lo mismo que
   * `linkCurrent`, que es el nombre que deberían usar los llamadores nuevos.
   */
  async getCurrent(): Promise<EnrichedStaffMemberRow | null> {
    return this.linkCurrent();
  }

  /**
   * El miembro del usuario de la sesión, vinculándolo por email si todavía no
   * tiene uno y hay un único miembro sin usuario cuyo contacto tiene su mismo
   * email. Sin sesión o sin coincidencia devuelve `null`.
   */
  async linkCurrent(): Promise<EnrichedStaffMemberRow | null> {
    const user = await this.context.users.current();
    if (!user) return null;
    const linked = await this.getByUser({ userId: user.id });
    if (linked) return linked;
    const email = user.email?.trim().toLowerCase();
    if (!email) return null;
    const candidates = (await this.db.ormQuery((tx) =>
      tx
        .select({ id: staffMemberTable.id })
        .from(staffMemberTable)
        .innerJoin(contactTable, CONTACT_JOIN)
        .where(and(isNull(staffMemberTable.user_id), sql`lower(${contactTable.email}) = ${email}`))
        .limit(2)
    )) as Array<{ id: string }>;
    if (candidates.length !== 1 || !candidates[0]) return null;
    await this.linkUser({ id: candidates[0].id, userId: user.id });
    return (await this.getByUser({ userId: user.id })) ?? null;
  }

  /**
   * La página de `search` y cuántos cumplen los filtros, en UNA consulta:
   * `count(*) OVER()` se calcula antes del LIMIT. Solo si la página vino vacía
   * (un offset más allá del final) hace falta contar aparte.
   */
  async searchPage(
    params: SearchParams
  ): Promise<{ items: EnrichedStaffMemberRow[]; total: number }> {
    const conditions = searchConditions(params);
    const rows = (await this.db.ormQuery((tx) => {
      let q = tx
        .select({ ...ENRICHED_COLUMNS, total: sql<number>`count(*) over()`.mapWith(Number) })
        .from(staffMemberTable)
        .leftJoin(contactTable, CONTACT_JOIN)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(searchOrder(params.orderBy, params.orderDir ?? 'asc'))
        .$dynamic();
      if (params.limit) q = q.limit(params.limit);
      if (params.offset) q = q.offset(params.offset);
      return q;
    })) as Array<EnrichedStaffMemberRow & { total: number }>;
    if (rows.length === 0) {
      return { items: [], total: params.offset ? await this.countSearch(params) : 0 };
    }
    const total = rows[0]?.total ?? 0;
    return { items: rows.map(({ total: _total, ...row }) => row), total };
  }

  /** Cuántos miembros cumplen los filtros de `search` (sin paginar). */
  async countSearch(params: SearchParams): Promise<number> {
    const conditions = searchConditions(params);
    const rows = await this.db.ormQuery((tx) =>
      tx
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(staffMemberTable)
        .leftJoin(contactTable, CONTACT_JOIN)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
    );
    return rows[0]?.count ?? 0;
  }

  /** Vincula un miembro con un usuario. Un usuario tiene como mucho un miembro. */
  async linkUser({
    id,
    userId,
  }: {
    id: string;
    userId: string | number;
  }): Promise<StaffMemberRow[]> {
    return this.update({ id, data: { user_id: String(userId) } });
  }

  /** Quita el vínculo con el usuario. El miembro sigue existiendo. */
  async unlinkUser({ id }: { id: string }): Promise<StaffMemberRow[]> {
    return this.update({ id, data: { user_id: null } });
  }

  /**
   * Usuarios del tenant con el miembro vinculado (si tiene), para elegir a quién
   * vincular desde la gestión del equipo. Sin emails: el email de otro usuario lo
   * ve solo el dueño del negocio (regla del Core en GET /users).
   */
  async listUsers(): Promise<Array<{ id: string; name: string; staff_id: string | null }>> {
    const users = await this.context.users.list();
    const links = (await this.db.ormQuery((tx) =>
      tx
        .select({ id: staffMemberTable.id, user_id: staffMemberTable.user_id })
        .from(staffMemberTable)
        .where(isNotNull(staffMemberTable.user_id))
    )) as Array<{ id: string; user_id: string | null }>;
    const byUser = new Map(links.map((l) => [l.user_id, l.id]));
    return users.map((u) => ({
      id: String(u.id),
      name: u.name?.trim() || `Usuario ${String(u.id)}`,
      staff_id: byUser.get(String(u.id)) ?? null,
    }));
  }

  private async assertUserFree(userId: string, exceptId?: string): Promise<void> {
    const rows = (await this.db.ormQuery((tx) =>
      tx
        .select({ id: staffMemberTable.id })
        .from(staffMemberTable)
        .where(eq(staffMemberTable.user_id, userId))
        .limit(1)
    )) as Array<{ id: string }>;
    if (rows[0] && rows[0].id !== exceptId) {
      throw conflict('Ese usuario ya está vinculado a otro miembro del equipo.');
    }
  }
}

/** Un dato que choca con otro existente: el Core lo devuelve como `CONFLICT`. */
function conflict(message: string): Error {
  return Object.assign(new Error(message), { code: 'CONFLICT' as const });
}

/** Los filtros de `search`, compartidos con `countSearch`. */
function searchConditions({ query, role, isActive }: SearchParams): SQL[] {
  const conditions: SQL[] = [];

  if (query) {
    const pattern = `%${query}%`;
    const matches = or(
      ilike(contactTable.name, pattern),
      ilike(contactTable.email, pattern),
      ilike(contactTable.phone, pattern),
      ilike(staffMemberTable.role, pattern),
      ilike(staffMemberTable.specialty, pattern),
      ilike(staffMemberTable.license_number, pattern)
    );
    if (matches) conditions.push(matches);
  }

  if (role) {
    conditions.push(eq(staffMemberTable.role, role));
  }

  if (isActive !== undefined) {
    conditions.push(eq(staffMemberTable.is_active, isActive));
  }

  return conditions;
}

/** Columnas por las que se ordena `search`; sin una conocida, por nombre del contacto. */
const SORTABLE = {
  name: contactTable.name,
  role: staffMemberTable.role,
  is_active: staffMemberTable.is_active,
  created_at: staffMemberTable.created_at,
} as const;

function searchOrder(orderBy: string | undefined, orderDir: 'asc' | 'desc'): SQL {
  const column = orderBy ? SORTABLE[orderBy as keyof typeof SORTABLE] : undefined;
  if (!column) return asc(contactTable.name);
  return orderDir === 'desc' ? desc(column) : asc(column);
}
