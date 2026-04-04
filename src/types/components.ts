/**
 * Props para componentes reutilizables de staff.
 */
import type { StaffFilters } from './filters.js';
import type { StaffMember, StaffMemberCreateData } from './staff-member.js';

// ---------------------------------------------------------------------------
// StaffPicker
// ---------------------------------------------------------------------------

export interface StaffPickerProps {
  filters?: StaffFilters;
  value?: string | null;
  onChange?: (member: StaffMember | null) => void;
  placeholder?: string;
  allowCreate?: boolean;
  onCreateClick?: (query: string) => void;
  createDefaults?: Partial<StaffMemberCreateData>;
  disabled?: boolean;
  className?: string;
}

// ---------------------------------------------------------------------------
// StaffBadge
// ---------------------------------------------------------------------------

export interface StaffBadgeProps {
  staffId?: string | null;
  staff?: StaffMember | null;
  variant?: 'compact' | 'default' | 'full';
  showStatus?: boolean;
  className?: string;
}
