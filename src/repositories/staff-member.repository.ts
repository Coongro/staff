import { contactTable } from '@coongro/contacts/server';
import type { ModuleDatabaseAPI } from '@coongro/plugin-sdk';
import { eq, and, or, ilike, asc, desc, sql } from 'drizzle-orm';

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

export class StaffMemberRepository {
  constructor(private readonly db: ModuleDatabaseAPI) {}

  // ---------------------------------------------------------------------------
  // CRUD base
  // ---------------------------------------------------------------------------

  async list(): Promise<StaffMemberRow[]> {
    return this.db.ormQuery((tx) => tx.select().from(staffMemberTable));
  }

  async getById({ id }: { id: string }): Promise<EnrichedStaffMemberRow | undefined> {
    const rows = await this.db.ormQuery((tx) =>
      tx
        .select({
          id: staffMemberTable.id,
          contact_id: staffMemberTable.contact_id,
          role: staffMemberTable.role,
          specialty: staffMemberTable.specialty,
          license_number: staffMemberTable.license_number,
          is_active: staffMemberTable.is_active,
          metadata: staffMemberTable.metadata,
          created_at: staffMemberTable.created_at,
          updated_at: staffMemberTable.updated_at,
          contact_name: contactTable.name,
          contact_email: contactTable.email,
          contact_phone: contactTable.phone,
          contact_avatar_url: contactTable.avatar_url,
        })
        .from(staffMemberTable)
        .leftJoin(contactTable, eq(staffMemberTable.contact_id, sql`${contactTable.id}::text`))
        .where(eq(staffMemberTable.id, id))
        .limit(1)
    );
    return rows[0] as EnrichedStaffMemberRow | undefined;
  }

  async create({ data }: { data: NewStaffMemberRow }): Promise<StaffMemberRow[]> {
    const id = data.id ?? crypto.randomUUID();
    const fullData = data as StaffMemberRow;
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
        .select({
          id: staffMemberTable.id,
          contact_id: staffMemberTable.contact_id,
          role: staffMemberTable.role,
          specialty: staffMemberTable.specialty,
          license_number: staffMemberTable.license_number,
          is_active: staffMemberTable.is_active,
          metadata: staffMemberTable.metadata,
          created_at: staffMemberTable.created_at,
          updated_at: staffMemberTable.updated_at,
          contact_name: contactTable.name,
          contact_email: contactTable.email,
          contact_phone: contactTable.phone,
          contact_avatar_url: contactTable.avatar_url,
        })
        .from(staffMemberTable)
        .leftJoin(contactTable, eq(staffMemberTable.contact_id, sql`${contactTable.id}::text`));

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
}
