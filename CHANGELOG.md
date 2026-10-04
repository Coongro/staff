# @coongro/staff

## 0.3.0

### Minor Changes

- `staff.members.list` devuelve también los datos del contacto de cada miembro

  Como ya hacían `search` y `getById`, cada fila trae `contact_name`, `contact_email`,
  `contact_phone` y `contact_avatar_url` (join con contacts). Es aditivo: las columnas de
  antes siguen iguales, sin orden ni paginación nuevos.

### Patch Changes

- El manifest declara qué métodos del repositorio son actions.

  Sin esa lista el runtime escanea la clase compilada y registra lo que encuentre,
  así que un método interno nuevo se volvía una action publicada sin que nadie lo
  decidiera. La lista positiva es ahora la autoridad: lo que no está declarado, no
  se expone.

## 0.2.0

### Minor Changes

- 509593c: feat: initial release of @coongro/staff plugin
  - Schema: staff_member linked to contacts via contact_id
  - Repository: CRUD + search with JOIN to contacts, license_number unique validation
  - Hooks: useStaffMembers, useStaffMember, useStaffMutations
  - Components: StaffPicker (combobox), StaffBadge (compact/default/full)
  - Utils: avatar helpers
  - Dependency: @coongro/contacts
