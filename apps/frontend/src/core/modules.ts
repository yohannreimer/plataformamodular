import {
  hasAnyPermission,
  type InternalPermission,
  type InternalRole,
  type InternalSessionUser
} from '../auth/session';
import type { AccountProductKey } from '../auth/accountAccess';
import type { LucideIcon } from 'lucide-react';
import { CalendarCheck, TrendingUp } from 'lucide-react';

export type PlatformModuleId = 'technical' | 'finance';

export type PlatformModule = {
  id: PlatformModuleId;
  productKey: AccountProductKey;
  slug: string;
  name: string;
  eyebrow: string;
  description: string;
  entryPath: string;
  defaultPath: string;
  permissions: InternalPermission[];
  roles?: InternalRole[];
  accent: string;
  icon?: LucideIcon;
  hubStat?: string;
  comingSoon?: boolean;
};

export const TECHNICAL_BASE_PATH = '/m/tecnico';
export const FINANCE_BASE_PATH = '/m/financeiro';

export const TECHNICAL_PERMISSIONS: InternalPermission[] = [
  'dashboard',
  'calendar',
  'cohorts',
  'clients',
  'technicians',
  'implementation',
  'support',
  'recruitment',
  'licenses',
  'license_programs',
  'docs',
  'admin'
];

export const FINANCE_PERMISSIONS: InternalPermission[] = [
  'finance.read',
  'finance.write',
  'finance.approve',
  'finance.reconcile',
  'finance.close',
  'finance.billing'
];

export const PLATFORM_MODULES: PlatformModule[] = [
  {
    id: 'technical',
    productKey: 'orquestrador',
    slug: 'tecnico',
    name: 'Velio',
    eyebrow: 'Operação',
    description: 'Gestão de equipe técnica, agenda, clientes, implantação, suporte e portal.',
    entryPath: TECHNICAL_BASE_PATH,
    defaultPath: `${TECHNICAL_BASE_PATH}/calendario`,
    permissions: TECHNICAL_PERMISSIONS,
    accent: '#1c8b61',
    icon: CalendarCheck,
    hubStat: '12 turmas'
  },
  {
    id: 'finance',
    productKey: 'financeiro',
    slug: 'financeiro',
    name: 'Fluvia',
    eyebrow: 'Gestão financeira',
    description: 'Caixa, contas, conciliação, relatórios, cadastros e simulações.',
    entryPath: FINANCE_BASE_PATH,
    defaultPath: `${FINANCE_BASE_PATH}/overview`,
    permissions: FINANCE_PERMISSIONS,
    roles: ['supremo'],
    accent: '#4f46e5',
    icon: TrendingUp,
    hubStat: 'R$ 284k'
  }
];

export function canAccessModule(user: InternalSessionUser | null | undefined, module: PlatformModule): boolean {
  if (!user) return false;
  if (module.roles && !module.roles.includes(user.role)) return false;
  return hasAnyPermission(user, module.permissions);
}

export function visibleModulesForUser(user: InternalSessionUser | null | undefined): PlatformModule[] {
  return PLATFORM_MODULES.filter((module) => canAccessModule(user, module));
}

export function moduleById(id: PlatformModuleId): PlatformModule | undefined {
  return PLATFORM_MODULES.find((module) => module.id === id);
}

export function defaultModulePathForUser(user: InternalSessionUser | null | undefined): string {
  return visibleModulesForUser(user)[0]?.entryPath ?? '/app';
}
