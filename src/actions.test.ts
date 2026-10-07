import {
  callAction,
  testContext,
  testDatabase,
  type TestDatabase,
} from '@coongro/plugin-sdk/testing';
import { sql } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { staffActions } from './actions.js';

let db: TestDatabase;
const ANA = '00000000-0000-4000-8000-0000000000a1';
const BETO = '00000000-0000-4000-8000-0000000000b2';
const CARLA = '00000000-0000-4000-8000-0000000000c3';

beforeAll(async () => {
  // staff lee los contactos (nombre, email): sus migraciones van primero, como las instala el Core.
  db = await testDatabase({
    migrations: [
      new URL('../../contacts/drizzle/', import.meta.url),
      new URL('../drizzle/', import.meta.url),
    ],
  });
  await db.ormQuery((tx) =>
    tx.execute(
      sql.raw(`INSERT INTO module_contacts_contacts (id, type, name, email) VALUES
        ('${ANA}', 'staff', 'Ana', 'ana@ejemplo.com'),
        ('${BETO}', 'staff', 'Beto', 'beto@ejemplo.com'),
        ('${CARLA}', 'staff', 'Carla', null)`)
    )
  );
  const ctx = testContext({ db });
  for (const [contact_id, role, is_active] of [
    [ANA, 'vet', true],
    [BETO, 'admin', true],
    [CARLA, 'vet', false],
  ] as const) {
    await callAction(staffActions.create, { data: { contact_id, role, is_active } }, ctx);
  }
});
afterAll(() => db.close());

describe('forma canónica', () => {
  it('list devuelve el equipo entero como array, con los datos del contacto', async () => {
    const list = await callAction<Array<{ contact_name: string }>>(
      staffActions.list,
      undefined,
      testContext({ db })
    );
    expect(Array.isArray(list)).toBe(true);
    expect(list.map((m) => m.contact_name).sort()).toEqual(['Ana', 'Beto', 'Carla']);
  });

  it('search devuelve una página con el total', async () => {
    const page = await callAction<{ items: Array<{ contact_name: string }>; total: number }>(
      staffActions.search,
      { limit: 1, orderBy: 'name' },
      testContext({ db })
    );
    expect(page.total).toBe(3);
    expect(page.items.map((m) => m.contact_name)).toEqual(['Ana']);
  });

  it('search filtra y busca por `query` o por `search`', async () => {
    const ctx = testContext({ db });
    const vets = await callAction<{ total: number }>(
      staffActions.search,
      { role: 'vet', is_active: true },
      ctx
    );
    expect(vets.total).toBe(1);
    const byQuery = await callAction<{ total: number }>(staffActions.search, { query: 'bet' }, ctx);
    const bySearch = await callAction<{ total: number }>(
      staffActions.search,
      { search: 'bet' },
      ctx
    );
    expect(byQuery.total).toBe(1);
    expect(bySearch.total).toBe(1);
  });

  it('search rechaza un orden que no está declarado', async () => {
    await expect(
      callAction(staffActions.search, { orderBy: 'contact_id' }, testContext({ db }))
    ).rejects.toMatchObject({ code: 'VALIDATION' });
  });

  it('update devuelve el registro, no [registro]', async () => {
    const ctx = testContext({ db });
    const page = await callAction<{ items: Array<{ id: string }> }>(
      staffActions.search,
      { query: 'ana' },
      ctx
    );
    const id = page.items[0]?.id;
    const updated = await callAction<{ id: string; specialty: string }>(
      staffActions.update,
      { id, data: { specialty: 'Cirugía' } },
      ctx
    );
    expect(updated).toMatchObject({ id, specialty: 'Cirugía' });
  });
});

describe('lecturas que exigen el id', () => {
  it('getById sin id responde VALIDATION', async () => {
    await expect(callAction(staffActions.getById, {}, testContext({ db }))).rejects.toMatchObject({
      code: 'VALIDATION',
    });
  });

  it('findByContactId sin contactId responde VALIDATION', async () => {
    await expect(
      callAction(staffActions.findByContactId, {}, testContext({ db }))
    ).rejects.toMatchObject({ code: 'VALIDATION' });
  });
});
