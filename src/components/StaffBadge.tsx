/**
 * Componente read-only para mostrar un miembro del staff.
 * Tres variantes: compact (tabla), default (card), full (detalle).
 * Datos personales resueltos desde el contacto vinculado.
 * Usa inline styles para layout (cross-plugin safe).
 */
import { getHostReact } from '@coongro/plugin-sdk';

import { useStaffMember } from '../hooks/useStaffMember.js';
import { getInitials, getAvatarColor, formatStaffSubtitle } from '../lib/avatar.js';
import type { StaffBadgeProps } from '../types/components.js';

const React = getHostReact();

const AVATAR_SIZES = {
  compact: { size: 24, fontSize: 10 },
  default: { size: 32, fontSize: 13 },
  full: { size: 40, fontSize: 15 },
} as const;

export function StaffBadge(props: StaffBadgeProps) {
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
    return React.createElement(
      'span',
      {
        className,
        style: { display: 'inline-flex', alignItems: 'center', gap: '8px' },
      },
      React.createElement('span', {
        style: {
          width: `${avatarSize.size}px`,
          height: `${avatarSize.size}px`,
          borderRadius: '50%',
          background: 'linear-gradient(90deg, #E8E6E1 25%, #F0EFEB 50%, #E8E6E1 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s ease-in-out infinite',
        },
      }),
      React.createElement('span', {
        style: {
          width: '120px',
          height: '14px',
          borderRadius: '4px',
          background: 'linear-gradient(90deg, #E8E6E1 25%, #F0EFEB 50%, #E8E6E1 75%)',
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s ease-in-out infinite',
        },
      })
    );
  }

  // Empty
  if (!member) {
    return React.createElement(
      'span',
      {
        className,
        style: {
          display: 'inline-flex',
          alignItems: 'center',
          gap: '8px',
          color: '#9B9893',
          fontSize: '14px',
          fontStyle: 'italic',
        },
      },
      React.createElement(
        'span',
        {
          style: {
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '24px',
            height: '24px',
            borderRadius: '50%',
            backgroundColor: '#F3F4F6',
            color: '#6B7280',
            fontSize: '12px',
          },
        },
        '—'
      ),
      'Sin asignar'
    );
  }

  const name = member.contact_name;
  const color = getAvatarColor(name, member.is_active);
  const initials = getInitials(name);
  const avatarSize = AVATAR_SIZES[variant];

  const avatarEl = React.createElement(
    'span',
    {
      style: {
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
      },
    },
    initials
  );

  const nameStyle = {
    fontSize: '14px',
    fontWeight: 500,
    lineHeight: '1.2',
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden' as const,
    textOverflow: 'ellipsis' as const,
    ...(member.is_active ? {} : { color: '#9B9893', textDecoration: 'line-through' }),
  };

  // Compact: avatar + nombre
  if (variant === 'compact') {
    return React.createElement(
      'span',
      {
        className,
        style: { display: 'inline-flex', alignItems: 'center', gap: '8px' },
      },
      avatarEl,
      React.createElement('span', { style: { ...nameStyle, fontWeight: 400 } }, name)
    );
  }

  const subtitle = formatStaffSubtitle(
    member.role,
    member.specialty,
    variant === 'full' ? member.license_number : null
  );

  const infoEl = React.createElement(
    'span',
    { style: { flex: 1, minWidth: 0 } },
    React.createElement('span', { style: { ...nameStyle, display: 'block' } }, name),
    React.createElement(
      'span',
      {
        style: {
          display: 'block',
          fontSize: '12px',
          color: '#9B9893',
          lineHeight: '1.2',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        },
      },
      subtitle
    )
  );

  // Default: avatar + nombre + rol
  if (variant === 'default') {
    return React.createElement(
      'span',
      {
        className,
        style: { display: 'inline-flex', alignItems: 'center', gap: '10px' },
      },
      avatarEl,
      infoEl
    );
  }

  // Full: con borde + status dot
  const statusDot =
    showStatus !== false
      ? React.createElement('span', {
          style: {
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            backgroundColor: member.is_active ? '#16A34A' : '#D1D5DB',
            flexShrink: 0,
          },
          title: member.is_active ? 'Activo' : 'Inactivo',
        })
      : null;

  return React.createElement(
    'span',
    {
      className,
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: '12px',
        padding: '10px 14px',
        backgroundColor: '#FFFFFF',
        border: '1px solid #E8E6E1',
        borderRadius: '12px',
      },
    },
    avatarEl,
    infoEl,
    statusDot
  );
}
