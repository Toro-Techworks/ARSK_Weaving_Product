import {
  LayoutDashboard,
  Building2,
  ClipboardList,
  Factory,
  Settings2,
  CalendarCheck,
  BarChart3,
  FileText,
  Wallet,
  TrendingUp,
  TrendingDown,
  Package,
  Shield,
  Users,
  Lock,
  LogOut,
  User,
  Receipt,
  FileBarChart,
  Cog,
  Key,
  Menu,
  Activity,
} from 'lucide-react';

/** Spec: ReceiptText — not in all lucide-react versions; Receipt is the closest match */
const ReceiptText = Receipt;

/**
 * Lucide icon components by canonical name (used in DB `menus.icon` or mapping below).
 */
export const iconMap = {
  LayoutDashboard,
  ReceiptText,
  Building2,
  ClipboardList,
  Factory,
  Settings2,
  CalendarCheck,
  BarChart3,
  FileText,
  Wallet,
  TrendingUp,
  TrendingDown,
  Package,
  Shield,
  Users,
  Lock,
  LogOut,
  User,
  Receipt,
  Menu,
  Activity,
  // Legacy / alias names still stored in DB
  FileBarChart: BarChart3,
  Cog: Settings2,
  Key: Lock,
};

/**
 * Context-based icons by `menu_key` (authoritative over DB icon string).
 */
export const MENU_KEY_TO_ICON_NAME = {
  dashboard: 'LayoutDashboard',
  companies: 'Building2',
  orders: 'ClipboardList',

  loom_production: 'Factory',
  'loom_production.looms': 'Factory',
  'loom_production.daily': 'CalendarCheck',
  'loom_production.report': 'BarChart3',

  payments: 'TrendingUp',
  expenses: 'TrendingDown',

  finance: 'Wallet',
  income: 'TrendingUp',

  reports: 'FileText',
  'reports.production': 'BarChart3',
  'reports.yarn_consumption': 'Package',
  'reports.order_summary': 'ReceiptText',
  'reports.loom_efficiency': 'Activity',

  yarn_stock: 'Package',

  admin_panel: 'Shield',
  'admin.users': 'Users',
  'admin.permissions': 'Lock',

  settings: 'User',
  'settings.profile': 'User',
};

const DEFAULT_ICON = FileText;

/**
 * Resolve icon component for a menu row from API (`menu_key`, optional `icon` string).
 * No generic circle placeholders — unknown keys fall back to FileText.
 */
export function getIconForMenu(menu) {
  if (!menu) return DEFAULT_ICON;

  const key = menu.menu_key;
  if (key && MENU_KEY_TO_ICON_NAME[key] && iconMap[MENU_KEY_TO_ICON_NAME[key]]) {
    return iconMap[MENU_KEY_TO_ICON_NAME[key]];
  }

  if (typeof key === 'string' && key.toLowerCase().includes('gst')) {
    return ReceiptText;
  }

  if (menu.icon && iconMap[menu.icon]) {
    return iconMap[menu.icon];
  }

  return DEFAULT_ICON;
}

/**
 * Resolve by stored icon name only (e.g. fallback dashboard link).
 */
export function getIcon(name) {
  if (!name) return DEFAULT_ICON;
  return iconMap[name] || DEFAULT_ICON;
}
