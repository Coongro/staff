/**
 * Tipos de staff member para uso en componentes y hooks.
 * Los datos personales (nombre, email, phone) vienen del contacto vinculado.
 */

export interface StaffMember {
  id: string;
  contact_id: string;
  role: string;
  specialty: string | null;
  license_number: string | null;
  is_active: boolean;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  // Datos resueltos del contacto vinculado
  contact_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  contact_avatar_url: string | null;
}

export interface StaffMemberCreateData {
  id?: string;
  contact_id: string;
  role: string;
  specialty?: string | null;
  license_number?: string | null;
  is_active?: boolean;
  metadata?: Record<string, unknown> | null;
}

export type StaffMemberUpdateData = Partial<StaffMemberCreateData>;
