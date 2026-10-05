---
'@coongro/staff': minor
---

Las acciones de staff se declaran con `@coongro/plugin-sdk/actions`: el Core valida lo que llega a cada una y solo se escriben los datos del miembro (no `created_at` ni `updated_at`). Un alta sin `is_active` lo toma como activo; antes fallaba en la base.

Una matrícula o un usuario ya tomados vuelven como error `CONFLICT`. Las acciones devuelven la forma nueva a quien la pide (un miembro en vez de `[miembro]`; `search` y `list` como `{ items, total }`) y la de siempre a los demás, así que activities, crm-contacts y opportunities no cambian. Los hooks usan el cliente tipado y la lista muestra el total real.

Requiere Core 0.61.0 o posterior.
