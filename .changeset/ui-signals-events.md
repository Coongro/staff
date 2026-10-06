---
"@coongro/staff": patch
---

`staff.members.getCurrent` se declara `mutation` (puede vincular por email al usuario de la sesión, como antes) y se agrega `staff.members.linkCurrent`, la misma operación con un nombre explícito. Requiere Core >=0.68.0.
