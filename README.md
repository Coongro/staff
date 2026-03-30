# @coongro/staff

Plugin de gestión de personal y profesionales para Coongro.

## Descripción

`@coongro/staff` modela al personal interno de un negocio: veterinarios, peluqueros, técnicos, administradores, o cualquier profesional que opera dentro de la plataforma. Es genérico por diseño — no está atado al vertical veterinario.

## Motivación

Actualmente, `@coongro/consultations` registra al veterinario como texto libre (`vet_name`). Este plugin reemplaza ese campo con una entidad real que permite:

- Seleccionar profesionales desde un picker reutilizable
- Asociar consultas, citas y operaciones a un miembro del staff
- Gestionar matrícula profesional, especialidad y estado activo/inactivo
- Reutilizar la entidad en cualquier vertical (veterinario, salón, clínica, etc.)

## Entidad principal

**StaffMember**

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | uuid | Identificador único |
| `first_name` | text | Nombre |
| `last_name` | text | Apellido |
| `email` | text? | Email (opcional) |
| `phone` | text? | Teléfono (opcional) |
| `role` | text | Rol principal (ej: "veterinarian", "groomer", "admin") |
| `specialty` | text? | Especialidad (ej: "Cirugía", "Dermatología") |
| `license_number` | text? | Matrícula profesional |
| `avatar_url` | text? | URL de avatar |
| `is_active` | boolean | Estado activo/inactivo |
| `metadata` | jsonb? | Datos adicionales flexibles |
| `created_at` | timestamp | Fecha de creación |
| `updated_at` | timestamp | Fecha de actualización |

## Exports públicos

| Export | Descripción |
|--------|-------------|
| `StaffPicker` | Combobox reutilizable para seleccionar un miembro del staff (similar a `PetPicker` de patients) |
| `useStaffMember(id)` | Hook para obtener un miembro del staff por ID |
| `useStaffMembers(filters)` | Hook para listar miembros del staff con filtros |
| Tipos: `StaffMember`, `StaffMemberInput` | Tipos TypeScript públicos |

## Dependencias

- **Requiere:** ninguna (plugin base)
- **Consumido por:** `@coongro/consultations` (reemplaza `vet_name` → `vet_id`), `@coongro/calendar` (asignar profesional a citas)

## Cadena de dependencias del kit veterinario

```
contacts → patients ─┐
                      ├→ consultations → kit-veterinary
              staff ──┘
```

## Vistas

| Vista | Descripción |
|-------|-------------|
| `staff.list` | Lista de miembros del staff con filtros por rol y estado |
| `staff.form` | Formulario de alta/edición de un miembro del staff |

## Desarrollo

```bash
# En el directorio del plugin
npm run build          # Compilar
npm run quality        # Typecheck + lint + format
```

## Licencia

Privado — Coongro
