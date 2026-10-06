# @coongro/staff

## 0.4.3

### Patch Changes

- Componentes y hooks del navegador en JSX con imports normales (`react`, `@coongro/ui-components`) en lugar de `React.createElement` + `getHostReact()`/`getHostUI()`. Mismo render, sin cambios de comportamiento. Requiere Core >=0.69.0.

## 0.4.2

### Patch Changes

- `staff.members.getCurrent` se declara `mutation` (puede vincular por email al usuario de la sesión, como antes) y se agrega `staff.members.linkCurrent`, la misma operación con un nombre explícito. Requiere Core >=0.68.0.

## 0.4.1

### Patch Changes

- El manifest declara con qué acción se borra cada entidad (`deleteAction`), y las vistas regeneradas solo llaman a acciones que existen. No cambia ninguna vista.

## 0.4.0

### Minor Changes

- Las acciones de staff se declaran con `@coongro/plugin-sdk/actions`: el Core valida lo que llega a cada una y solo se escriben los datos del miembro (no `created_at` ni `updated_at`). Un alta sin `is_active` lo toma como activo; antes fallaba en la base.

  Una matrícula o un usuario ya tomados vuelven como error `CONFLICT`. Las acciones devuelven la forma nueva a quien la pide (un miembro en vez de `[miembro]`; `search` y `list` como `{ items, total }`) y la de siempre a los demás, así que activities, crm-contacts y opportunities no cambian. Los hooks usan el cliente tipado y la lista muestra el total real.

  Requiere Core 0.61.0 o posterior.

### Patch Changes

- `search` trae la página y el total en una sola consulta (`count(*) OVER()`) en lugar de dos. Antes hacía la segunda aunque quien llama descartara el total.

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
