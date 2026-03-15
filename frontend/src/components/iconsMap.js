import {
  LayoutDashboard,
  Receipt,
  Building2,
  FileText,
  Cog,
  ChevronRight,
  LogOut,
  Factory,
  Wallet,
  FileBarChart,
  User,
  Shield,
  UserPlus,
  Users,
  Key,
  ClipboardList,
  Menu,
  Package,
} from 'lucide-react';

const iconMap = {
  LayoutDashboard,
  Receipt,
  Building2,
  FileText,
  Cog,
  Factory,
  Wallet,
  FileBarChart,
  Shield,
  UserPlus,
  Users,
  Key,
  ClipboardList,
  User,
  Menu,
  Package,
};

export function getIcon(name) {
  if (!name) return null;
  return iconMap[name] || null;
}
