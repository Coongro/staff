---
'@coongro/staff': minor
---

`staff.members.getCurrent` pasa a ser una lectura pura (`query`): devuelve el miembro vinculado al usuario de la sesión o `null`, y ya no lo vincula por email. Para vincular automáticamente está `staff.members.linkCurrent` (y `StaffMemberRepository.linkCurrent()` para otros plugins). Así el permiso de ver empleados, que otorga `getCurrent`, ya no permite escribir.
