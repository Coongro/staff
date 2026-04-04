---
"@coongro/staff": minor
---

feat: initial release of @coongro/staff plugin

- Schema: staff_member linked to contacts via contact_id
- Repository: CRUD + search with JOIN to contacts, license_number unique validation
- Hooks: useStaffMembers, useStaffMember, useStaffMutations
- Components: StaffPicker (combobox), StaffBadge (compact/default/full)
- Utils: avatar helpers
- Dependency: @coongro/contacts
