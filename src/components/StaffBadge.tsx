/**
 * Componente read-only para mostrar un miembro del staff.
 * Tres variantes: compact (tabla), default (card), full (detalle).
 * Datos personales resueltos desde el contacto vinculado.
 * Usa inline styles para layout (cross-plugin safe).
 */
import type { CSSProperties, ReactElement } from 'react';

import { useStaffMember } from '../hooks/useStaffMember.js';
import { getInitials, getAvatarColor, formatStaffSubtitle } from '../lib/avatar.js';
import type { StaffBadgeProps } from '../types/components.js';

const AVATAR_SIZES = {
  compact: { size: 24, fontSize: 10 },
  default: { size: 32, fontSize: 13 },
  full: { size: 40, fontSize: 15 },
} as const;

/** Barra con brillo animado mientras carga */
const SHIMMER: CSSProperties = {
  background: 'linear-gradient(90deg, #E8E6E1 25%, #F0EFEB 50%, #E8E6E1 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.5s ease-in-out infinite',
};

export function StaffBadge(props: StaffBadgeProps): ReactElement {
  const {
    staffId,
    staff: staffProp,
    variant = 'compact',
    showStatus = false,
    className = '',
  } = props;

  const { member: fetchedMember, loading } = useStaffMember(staffProp ? null : staffId);
  const member = staffProp ?? fetchedMember;

  // Loading
  if (loading && !member) {
    const avatarSize = AVATAR_SIZES[variant];
    return (
      <span
        className={className}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
      >
        <span
          style={{
            width: `${avatarSize.size}px`,
            height: `${avatarSize.size}px`,
            borderRadius: '50%',
            ...SHIMMER,
          }}
        />
        <span style={{ width: '120px', height: '14px', borderRadius: '4px', ...SHIMMER }} />
      </span>
    );
  }

  // Empty
  if (!member) {
    return (
      <span
        className={className}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          color: '#9B9893',
          fontSize: '14px',
          fontStyle: 'italic',
        }}
      >
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: '#F3F4F6',
            color: '#6B7280',
            fontSize: '12px',
          }}
        >
          —
        </span>
        Sin asignar
      </span>
    );
  }

  const name = member.contact_name;
  const color = getAvatarColor(name, member.is_active);
  const initials = getInitials(name);
  const avatarSize = AVATAR_SIZES[variant];

  const avatarEl = (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${avatarSize.size}px`,
        height: `${avatarSize.size}px`,
        borderRadius: '50%',
        fontSize: `${avatarSize.fontSize}px`,
        fontWeight: 600,
        backgroundColor: color.bg,
        color: color.text,
        flexShrink: 0,
      }}
    >
      {initials}
    </span>
  );

  const nameStyle: CSSProperties = {
    fontSize: '14px',
    fontWeight: 500,
    lineHeight: '1.2',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    ...(member.is_active ? {} : { color: '#9B9893', textDecoration: 'line-through' }),
  };

  // Compact: avatar + nombre
  if (variant === 'compact') {
    return (
      <span
        className={className}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
      >
        {avatarEl}
        <span style={{ ...nameStyle, fontWeight: 400 }}>{name}</span>
      </span>
    );
  }

  const subtitle = formatStaffSubtitle(
    member.role,
    member.specialty,
    variant === 'full' ? member.license_number : null
  );

  const infoEl = (
    <span style={{ flex: 1, minWidth: 0 }}>
      <span style={{ ...nameStyle, display: 'block' }}>{name}</span>
      <span
        style={{
          display: 'block',
          fontSize: '12px',
          color: '#9B9893',
          lineHeight: '1.2',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {subtitle}
      </span>
    </span>
  );

  // Default: avatar + nombre + rol
  if (variant === 'default') {
    return (
      <span
        className={className}
        style={{ display: 'inline-flex', alignItems: 'center', gap: '10px' }}
      >
        {avatarEl}
        {infoEl}
      </span>
    );
  }

  // Full: con borde + status dot
  const statusDot =
    showStatus !== false ? (
      <span
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: member.is_active ? '#16A34A' : '#D1D5DB',
          flexShrink: 0,
        }}
        title={member.is_active ? 'Activo' : 'Inactivo'}
      />
    ) : null;

  return (
    <span
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 14px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E8E6E1',
        borderRadius: '12px',
      }}
    >
      {avatarEl}
      {infoEl}
      {statusDot}
    </span>
  );
}
