import { pgTable, text, uuid } from 'drizzle-orm/pg-core';
import { describe, expect, it, vi } from 'vitest';

// Solo las columnas del contacto que lee el repositorio: el plugin de contactos no está
// instalado al correr los tests.
vi.mock('@coongro/contacts/server', () => ({
  contactTable: pgTable('module_contacts_contacts', {
    id: uuid('id'),
    name: text('name'),
    email: text('email'),
    phone: text('phone'),
    avatar_url: text('avatar_url'),
  }),
}));

const { StaffMemberRepository } = await import('./staff-member.repository.js');

const USER = { id: 7, email: 'Ana@Ejemplo.com' };
const MEMBER = { id: 's1', user_id: '7', contact_name: 'Ana' };

/**
 * Un usuario de la sesión sin miembro vinculado y un único miembro sin usuario con su
 * mismo email (el candidato que encuentra la consulta de `linkCurrent`).
 */
function unlinkedUserWithCandidate() {
  const ormQuery = vi.fn().mockResolvedValue([{ id: 's1' }]);
  const repo = new StaffMemberRepository(
    { ormQuery } as never,
    {
      users: { current: () => Promise.resolve(USER) },
    } as never
  );
  let linked = false;
  const getByUser = vi
    .spyOn(repo, 'getByUser')
    .mockImplementation(() => Promise.resolve(linked ? (MEMBER as never) : undefined));
  const linkUser = vi.spyOn(repo, 'linkUser').mockImplementation(() => {
    linked = true;
    return Promise.resolve([MEMBER as never]);
  });
  return { repo, ormQuery, getByUser, linkUser };
}

describe('StaffMemberRepository.getCurrent', () => {
  it('solo lee: sin vínculo devuelve null aunque haya un candidato por email', async () => {
    const { repo, ormQuery, getByUser, linkUser } = unlinkedUserWithCandidate();

    await expect(repo.getCurrent()).resolves.toBeNull();

    expect(getByUser).toHaveBeenCalledWith({ userId: 7 });
    expect(linkUser).not.toHaveBeenCalled();
    // Ni siquiera busca candidatos.
    expect(ormQuery).not.toHaveBeenCalled();
  });

  it('devuelve el miembro ya vinculado al usuario de la sesión', async () => {
    const { repo, getByUser } = unlinkedUserWithCandidate();
    getByUser.mockResolvedValue(MEMBER as never);

    await expect(repo.getCurrent()).resolves.toEqual(MEMBER);
  });

  it('sin contexto (sin sesión) devuelve null', async () => {
    const repo = new StaffMemberRepository({ ormQuery: vi.fn() } as never);

    await expect(repo.getCurrent()).resolves.toBeNull();
  });
});

describe('StaffMemberRepository.linkCurrent', () => {
  it('vincula al único candidato por email y lo devuelve', async () => {
    const { repo, ormQuery, linkUser } = unlinkedUserWithCandidate();

    await expect(repo.linkCurrent()).resolves.toEqual(MEMBER);

    expect(ormQuery).toHaveBeenCalledTimes(1);
    expect(linkUser).toHaveBeenCalledWith({ id: 's1', userId: 7 });
  });

  it('con más de un candidato no vincula', async () => {
    const { repo, ormQuery, linkUser } = unlinkedUserWithCandidate();
    ormQuery.mockResolvedValue([{ id: 's1' }, { id: 's2' }]);

    await expect(repo.linkCurrent()).resolves.toBeNull();
    expect(linkUser).not.toHaveBeenCalled();
  });
});
