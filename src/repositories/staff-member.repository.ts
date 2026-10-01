import { contactTable } from '@coongro/contacts/server';
import type { ModuleDatabaseAPI } from '@coongro/plugin-sdk';
import { eq, and, or, ilike, asc, desc, sql, isNull, isNotNull } from 'drizzle-orm';

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

/**
 * Contexto que el runtime pasa como segundo argumento al repositorio
 * (`new Repo(db, context)`). Mínimo y opcional: con un Core que no lo manda, las
 * acciones que dependen del usuario actual devuelven `null`.
 */
export interface StaffRepositoryContext {
  users?: {
    current(): Promise<{ id: number | string; name?: string | null; email?: string | null } | null>;
    list?(): Promise<Array<{ id: number | string; name?: string | null; email?: string | null }>>;
  };
}

export class StaffMemberRepository {
  constructor(
    private readonly db: ModuleDatabaseAPI,
    private readonly context?: StaffRepositoryContext
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

  async create({ data }: { data: NewStaffMemberRow }): Promise<StaffMemberRow[]> {
    const id = data.id ?? crypto.randomUUID();
    const fullData = data as StaffMemberRow;
    if (fullData.user_id) await this.assertUserFree(String(fullData.user_id));
    const licenseNumber = fullData.license_number;

    // Validar matrícula única entre activos
    if (licenseNumber) {
      const existing = await this.findByLicenseNumber({ licenseNumber });
      if (existing && existing.is_active) {
        throw new Error(`Ya existe un miembro activo con matrícula ${licenseNumber}`);
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
        throw new Error(`Ya existe un miembro activo con matrícula ${licenseNumber}`);
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
      const conditions = [];

      if (query) {
        const pattern = `%${query}%`;
        conditions.push(
          or(
            ilike(contactTable.name, pattern),
            ilike(contactTable.email, pattern),
            ilike(contactTable.phone, pattern),
            ilike(staffMemberTable.role, pattern),
            ilike(staffMemberTable.specialty, pattern),
            ilike(staffMemberTable.license_number, pattern)
          )
        );
      }

      if (role) {
        conditions.push(eq(staffMemberTable.role, role));
      }

      if (isActive !== undefined) {
        conditions.push(eq(staffMemberTable.is_active, isActive));
      }

      let q = tx
        .select(ENRICHED_COLUMNS)
        .from(staffMemberTable)
        .leftJoin(contactTable, CONTACT_JOIN);

      if (conditions.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        q = q.where(and(...conditions)) as typeof q;
      }

      // Ordenamiento — por defecto por nombre del contacto
      const dirFn = orderDir === 'desc' ? desc : asc;
      const sortableColumns: Record<string, () => typeof q> = {
        name: () => q.orderBy(dirFn(contactTable.name)) as typeof q,
        role: () => q.orderBy(dirFn(staffMemberTable.role)) as typeof q,
        is_active: () => q.orderBy(dirFn(staffMemberTable.is_active)) as typeof q,
        created_at: () => q.orderBy(dirFn(staffMemberTable.created_at)) as typeof q,
      };

      const applySorting = orderByField ? sortableColumns[orderByField] : undefined;
      if (applySorting) {
        q = applySorting();
      } else {
        q = q.orderBy(asc(contactTable.name)) as typeof q;
      }

      if (limit) {
        q = q.limit(limit) as typeof q;
      }

      if (offset) {
        q = q.offset(offset) as typeof q;
      }

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
   * sesión o sin coincidencia devuelve `null`.
   */
  async getCurrent(): Promise<EnrichedStaffMemberRow | null> {
    const user = this.context?.users ? await this.context.users.current() : null;
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
    const users = this.context?.users?.list ? await this.context.users.list() : [];
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
      throw new Error('Ese usuario ya está vinculado a otro miembro del equipo.');
    }
  }
}
