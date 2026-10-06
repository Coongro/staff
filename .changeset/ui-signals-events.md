---
"@coongro/staff": patch
---

`staff.members.getCurrent` ya no escribe: el vínculo automático por email del usuario de la sesión pasa a la nueva mutation `staff.members.linkCurrent`. Requiere Core >=0.68.0.
