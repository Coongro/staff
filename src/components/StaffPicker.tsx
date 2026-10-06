/**
 * Selector/buscador de miembro del staff.
 * Usa UI.Combobox con búsqueda server-side.
 * Nombre y datos personales vienen del contacto vinculado.
 */
import {
  Chip,
  Combobox,
  ComboboxChipTrigger,
  ComboboxContent,
  ComboboxCreate,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxItem,
  LoadingOverlay,
  useComboboxContext,
} from '@coongro/ui-components';
import { useCallback, useEffect } from 'react';
import type { ReactElement } from 'react';

import { useStaffMember } from '../hooks/useStaffMember.js';
import { useStaffMembers } from '../hooks/useStaffMembers.js';
import { getInitials, getAvatarColor, formatStaffSubtitle } from '../lib/avatar.js';
import type { StaffPickerProps } from '../types/components.js';
import type { StaffMember } from '../types/staff-member.js';

function AvatarCircle({
  name,
  isActive,
  size,
}: {
  name: string;
  isActive: boolean;
  size: number;
}): ReactElement {
  const color = getAvatarColor(name, isActive);
  const initials = getInitials(name);
  return (
    <span
      style={{
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
      }}
    >
      {initials}
    </span>
  );
}

export function StaffPicker(props: StaffPickerProps): ReactElement {
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

  return (
    <Combobox value={value ?? ''} onValueChange={handleValueChange} debounceMs={200}>
      {/* Trigger */}
      <ComboboxChipTrigger
        placeholder={placeholder}
        className={disabled ? `pointer-events-none opacity-60 ${className}` : className}
        renderChip={(_val: string, onRemove: () => void) => {
          const name = selectedMember?.contact_name ?? '...';
          return (
            <Chip
              size="sm"
              icon={
                <AvatarCircle name={name} isActive={selectedMember?.is_active ?? true} size={20} />
              }
              onRemove={disabled ? undefined : onRemove}
            >
              {name}
            </Chip>
          );
        }}
      />

      {/* Dropdown */}
      <StaffDropdown
        data={data}
        loading={loading}
        searchFn={searchStaff}
        allowCreate={allowCreate}
        onCreateClick={onCreateClick}
      />
    </Combobox>
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

function StaffDropdown(props: StaffDropdownProps): ReactElement {
  const { data, loading, searchFn, allowCreate, onCreateClick } = props;
  const { search, debouncedSearch, setOpen } = useComboboxContext();

  useEffect(() => {
    searchFn(debouncedSearch);
  }, [debouncedSearch, searchFn]);

  let results: ReactElement;
  if (loading) {
    results = (
      <LoadingOverlay variant="dots" label="Buscando..." inline className="justify-center py-4" />
    );
  } else if (data.length === 0) {
    results = <ComboboxEmpty>{search ? 'Sin resultados' : 'Escribí para buscar'}</ComboboxEmpty>;
  } else {
    results = (
      <ComboboxGroup>
        {data.map((member: StaffMember) => (
          <ComboboxItem
            key={member.id}
            value={member.id}
            icon={<AvatarCircle name={member.contact_name} isActive={member.is_active} size={32} />}
            subtitle={formatStaffSubtitle(member.role, member.specialty)}
          >
            {member.contact_name}
          </ComboboxItem>
        ))}
      </ComboboxGroup>
    );
  }

  return (
    <ComboboxContent className="max-h-[280px] overflow-y-auto">
      {results}
      {allowCreate && (
        <ComboboxCreate
          onCreate={(searchValue: string) => {
            onCreateClick?.(searchValue);
            setOpen(false);
          }}
          label={'Crear "{search}"'}
        />
      )}
    </ComboboxContent>
  );
}
