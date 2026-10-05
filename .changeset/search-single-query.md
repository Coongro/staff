---
'@coongro/staff': patch
---

`search` trae la página y el total en una sola consulta (`count(*) OVER()`) en lugar de dos. Antes hacía la segunda aunque quien llama descartara el total.
