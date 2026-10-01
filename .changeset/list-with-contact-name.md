---
'@coongro/staff': minor
---

`staff.members.list` devuelve también los datos del contacto de cada miembro

Como ya hacían `search` y `getById`, cada fila trae `contact_name`, `contact_email`,
`contact_phone` y `contact_avatar_url` (join con contacts). Es aditivo: las columnas de
antes siguen iguales, sin orden ni paginación nuevos.
