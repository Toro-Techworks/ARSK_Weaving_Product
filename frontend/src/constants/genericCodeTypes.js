/**
 * Server-side code_type values for GET /api/generic-code/:codeType
 * (hyphens in URL are normalized to underscores on the server).
 */
export const GENERIC_CODE_TYPES = {
  YARN_RECEIPT_TYPE: 'yarn_receipt_type',
  /** MASTER dropdown_type; use useGenericCode(..., { dropdownType: 'MASTER' }). */
  YARN_COLOUR: 'yarn_colour',
  /** Production planning multi-colour (MASTER); GET /api/generic-code/colour?dropdown_type=MASTER */
  COLOUR: 'colour',
  YARN_RECEIPT_COUNT: 'yarn_receipt_count',
  YARN_RECEIPT_CONTENT: 'yarn_receipt_content',
  ACTIVE_INACTIVE: 'active_inactive',
  SHIFT: 'shift',
  PAYMENT_MODE: 'payment_mode',
  PAYMENT_RECORD_STATUS: 'payment_record_status',
  EXPENSE_CATEGORY: 'expense_category',
  USER_STATUS: 'user_status',
  /** Mirrors `roles.role_name`; seeded in generic_codes (code_type `roles`). */
  ROLES: 'roles',
  MENU_LINK_STATUS: 'menu_link_status',
};

/** Fallback when API is down or table not seeded (yarn receipt UI). */
export const FALLBACK_YARN_RECEIPT_TYPES = [
  { value: 'Cone', label: 'Cone' },
  { value: 'Hank', label: 'Hank' },
];

export const FALLBACK_YARN_COLOURS = [
  { value: 'Red', label: 'Red' },
  { value: 'Green', label: 'Green' },
];

/** code_type `colour` (production planning fabric.colour). */
export const FALLBACK_PLANNING_COLOURS = [
  { value: 'Red', label: 'Red' },
  { value: 'Blue', label: 'Blue' },
  { value: 'Green', label: 'Green' },
];

/** MASTER; used for yarn receipt Count and Content (same options). */
export const FALLBACK_YARN_RECEIPT_COUNT_CONTENT = [
  { value: '20/10', label: '20/10' },
  { value: '30/10', label: '30/10' },
];

export const FALLBACK_ACTIVE_INACTIVE = [
  { value: 'Active', label: 'Active' },
  { value: 'Inactive', label: 'Inactive' },
];

export const FALLBACK_SHIFT_OPTIONS = [
  { value: 'Day', label: 'Day' },
  { value: 'Night', label: 'Night' },
];

export const FALLBACK_PAYMENT_MODES = [
  { value: 'Cash', label: 'Cash' },
  { value: 'Bank', label: 'Bank' },
  { value: 'UPI', label: 'UPI' },
];

export const FALLBACK_PAYMENT_RECORD_STATUS = [
  { value: 'open', label: 'Open' },
  { value: 'running', label: 'Running' },
  { value: 'closed', label: 'Closed' },
];

export const FALLBACK_EXPENSE_CATEGORY_OPTIONS = [
  { value: 'Electricity', label: 'Electricity' },
  { value: 'Labour', label: 'Labour' },
  { value: 'Maintenance', label: 'Maintenance' },
  { value: 'Yarn', label: 'Yarn' },
];

export const FALLBACK_USER_STATUS = [
  { value: 'active', label: 'Active' },
  { value: 'disabled', label: 'Disabled' },
];

/** code_type `roles`; only **active** generic rows (e.g. admin, user — not inactive super_admin). */
export const FALLBACK_ROLE_OPTIONS = [
  { value: 'admin', label: 'Admin' },
  { value: 'user', label: 'User' },
];
