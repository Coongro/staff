/**
 * Utilidades para avatar de staff: iniciales y color por hash del nombre.
 */

const AVATAR_COLORS = [
  { bg: '#DBEAFE', text: '#1D4ED8' }, // blue
  { bg: '#DCFCE7', text: '#15803D' }, // green
  { bg: '#EDE9FE', text: '#6D28D9' }, // purple
  { bg: '#FFF7ED', text: '#C2410C' }, // orange
  { bg: '#FCE7F3', text: '#BE185D' }, // pink
] as const;

const INACTIVE_COLOR = { bg: '#F3F4F6', text: '#6B7280' };

/** Extrae iniciales del nombre completo (ej: "María González" → "MG") */
export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
  }
  return name.charAt(0).toUpperCase();
}

/** Color de avatar basado en hash del nombre. Inactivo → gris. */
export function getAvatarColor(name: string, isActive = true): { bg: string; text: string } {
  if (!isActive) return INACTIVE_COLOR;
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[index];
}

/** Subtitulo: "rol · especialidad · MP xxxxx" */
export function formatStaffSubtitle(
  role: string,
  specialty?: string | null,
  licenseNumber?: string | null
): string {
  return [role, specialty, licenseNumber ? `MP ${licenseNumber}` : null]
    .filter(Boolean)
    .join(' · ');
}
