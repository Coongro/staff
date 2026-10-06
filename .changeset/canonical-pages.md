---
'@coongro/staff': minor
---

Forma canónica de las acciones, sin `legacy` (requiere Core ≥ 0.70):

- `staff.members.list`: devuelve el equipo como array (antes `{ items, total }` adaptado a array para quien no pedía la forma nueva). Es lo que listan los selectores de responsable.
- `staff.members.search`: siempre `{ items, total }` (`pageInput`): sin `limit` trae 50 (antes, todos); acepta `search` además de `query`, y `orderBy` solo `name`, `role`, `is_active` o `created_at`.
- `staff.members.create`, `update`, `linkUser`, `unlinkUser`: devuelven el registro (o `null`), nunca `[registro]`.
