/**
 * Selector/buscador de miembro del staff.
 * Usa UI.Combobox con búsqueda server-side.
 * Nombre y datos personales vienen del contacto vinculado.
 */
import { getHostReact, getHostUI } from '@coongro/plugin-sdk';

import { useStaffMember } from '../hooks/useStaffMember.js';
import { useStaffMembers } from '../hooks/useStaffMembers.js';
import { getInitials, getAvatarColor, formatStaffSubtitle } from '../lib/avatar.js';
import type { StaffPickerProps } from '../types/components.js';
import type { StaffMember } from '../types/staff-member.js';

const React = getHostReact();
const UI = getHostUI();
const { useCallback, useEffect } = React;

function AvatarCircle({ name, isActive, size }: { name: string; isActive: boolean; size: number }) {
  const color = getAvatarColor(name, isActive);
  const initials = getInitials(name);
  return React.createElement(
    'span',
    {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: '50%',
        fontSize: `${Math.round(size * 0.4)}px`,
        fontWeight: 600,
        backgroundColor: color.bg,
        color: color.text,
      },
    },
    initials
  );
}

export function StaffPicker(props: StaffPickerProps) {
  const {
    filters = {},
    value,
    onChange,
    placeholder = 'Buscar profesional...',
    allowCreate = false,
    onCreateClick,
    disabled = false,
    className = '',
  } = props;

  const { member: selectedMember } = useStaffMember(value);
  const {
    data,
    loading,
    search: searchStaff,
  } = useStaffMembers({
    ...filters,
    isActive: filters.isActive ?? true,
    pageSize: 10,
  });

  const handleValueChange = useCallback(
    (newValue: string) => {
      if (!newValue) {
        onChange?.(null);
        return;
      }
      const member = data.find((m: StaffMember) => m.id === newValue);
      if (member) {
        onChange?.(member);
      }
    },
    [data, onChange]
  );

  return React.createElement(
    UI.Combobox,
    {
      value: value ?? '',
      onValueChange: handleValueChange,
      debounceMs: 200,
    },

    // Trigger
    React.createElement(UI.ComboboxChipTrigger, {
      placeholder,
      className: disabled ? `pointer-events-none opacity-60 ${className}` : className,
      renderChip: (_val: string, onRemove: () => void) => {
        const name = selectedMember?.contact_name ?? '...';
        return React.createElement(
          UI.Chip,
          {
            size: 'sm',
            icon: React.createElement(AvatarCircle, {
              name,
              isActive: selectedMember?.is_active ?? true,
              size: 20,
            }),
            onRemove: disabled ? undefined : onRemove,
          },
          name
        );
      },
    }),

    // Dropdown
    React.createElement(StaffDropdown, {
      data,
      loading,
      searchFn: searchStaff,
      allowCreate,
      onCreateClick,
    })
  );
}

// ---------------------------------------------------------------------------
// Componente interno que accede al contexto del Combobox
// ---------------------------------------------------------------------------

interface StaffDropdownProps {
  data: StaffMember[];
  loading: boolean;
  searchFn: (q: string) => void;
  allowCreate: boolean;
  onCreateClick?: (query: string) => void;
}

function StaffDropdown(props: StaffDropdownProps) {
  const { data, loading, searchFn, allowCreate, onCreateClick } = props;
  const { search, debouncedSearch, setOpen } = UI.useComboboxContext();

  useEffect(() => {
    searchFn(debouncedSearch);
  }, [debouncedSearch, searchFn]);

  return React.createElement(
    UI.ComboboxContent,
    { className: 'max-h-[280px] overflow-y-auto' },

    loading
      ? React.createElement(UI.LoadingOverlay, {
          variant: 'dots',
          label: 'Buscando...',
          inline: true,
          className: 'justify-center py-4',
        })
      : data.length === 0
        ? React.createElement(
            UI.ComboboxEmpty,
            null,
            search ? 'Sin resultados' : 'Escribí para buscar'
          )
        : React.createElement(
            UI.ComboboxGroup,
            null,
            data.map((member: StaffMember) =>
              React.createElement(
                UI.ComboboxItem,
                {
                  key: member.id,
                  value: member.id,
                  icon: React.createElement(AvatarCircle, {
                    name: member.contact_name,
                    isActive: member.is_active,
                    size: 32,
                  }),
                  subtitle: formatStaffSubtitle(member.role, member.specialty),
                },
                member.contact_name
              )
            )
          ),

    allowCreate &&
      React.createElement(UI.ComboboxCreate, {
        onCreate: (searchValue: string) => {
          onCreateClick?.(searchValue);
          setOpen(false);
        },
        label: 'Crear "{search}"',
      })
  );
}
