import { sql } from 'drizzle-orm';
import { boolean, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const staffMemberTable = pgTable('module_staff_staff_members', {
  id: uuid('id').primaryKey().notNull(),
  contact_id: text('contact_id').notNull(),
  role: text('role').notNull(),
  specialty: text('specialty'),
  license_number: text('license_number'),
  is_active: boolean('is_active').notNull(),
  metadata: jsonb('metadata'),
  created_at: timestamp('created_at', { mode: 'string' })
    .notNull()
    .default(sql`now()`),
  updated_at: timestamp('updated_at', { mode: 'string' })
    .notNull()
    .default(sql`now()`),
});

export type StaffMemberRow = typeof staffMemberTable.$inferSelect;
export type NewStaffMemberRow = typeof staffMemberTable.$inferInsert;
