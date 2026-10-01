// Generado por el Coongro Builder desde contributes.permissions. No editar a mano.

export const StaffPermissions = {
  /** Eliminar empleados */
  membersDelete: 'staff.members.delete',
  /** Gestionar empleados */
  membersManage: 'staff.members.manage',
  /** Ver empleados */
  membersRead: 'staff.members.read',
} as const;

export type StaffPermission = (typeof StaffPermissions)[keyof typeof StaffPermissions];
