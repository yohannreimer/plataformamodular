import { type InternalPermission, type InternalRole, type InternalSessionUser } from './session';
import { TECHNICAL_BASE_PATH } from '../core/modules';
import type { LucideIcon } from 'lucide-react';
import {
  CalendarDays,
  ClipboardList,
  GraduationCap,
  Building2,
  Wrench,
  Kanban,
  LifeBuoy,
  UserSearch,
  KeyRound,
  BookOpen,
  Settings,
} from 'lucide-react';

export type AppNavItem = {
  to: string;
  label: string;
  permissions: InternalPermission[];
  roles?: InternalRole[];
  badgeCount?: number;
  icon?: LucideIcon;
};

type NavigationSessionUser = Omit<InternalSessionUser, 'permissions'> & {
  permissions: readonly InternalPermission[];
};

export const APP_NAV_ITEMS: AppNavItem[] = [
  { to: `${TECHNICAL_BASE_PATH}/calendario`, label: 'Calendário', permissions: ['calendar'], icon: CalendarDays },
  { to: `${TECHNICAL_BASE_PATH}/planejar`, label: 'Planejar', permissions: ['calendar', 'cohorts'], icon: ClipboardList },
  { to: `${TECHNICAL_BASE_PATH}/turmas`, label: 'Turmas', permissions: ['cohorts'], icon: GraduationCap },
  { to: `${TECHNICAL_BASE_PATH}/clientes`, label: 'Clientes', permissions: ['clients'], icon: Building2 },
  { to: `${TECHNICAL_BASE_PATH}/tecnicos`, label: 'Técnicos', permissions: ['technicians'], icon: Wrench },
  { to: `${TECHNICAL_BASE_PATH}/implementacao`, label: 'Implementação', permissions: ['implementation'], icon: Kanban },
  { to: `${TECHNICAL_BASE_PATH}/suporte`, label: 'Suporte', permissions: ['support', 'implementation'], icon: LifeBuoy },
  { to: `${TECHNICAL_BASE_PATH}/processos-seletivos`, label: 'Processos Seletivos', permissions: ['recruitment'], icon: UserSearch },
  { to: `${TECHNICAL_BASE_PATH}/licencas`, label: 'Licenças', permissions: ['licenses'], icon: KeyRound },
  { to: `${TECHNICAL_BASE_PATH}/licencas/programas`, label: 'Programas Licença', permissions: ['license_programs'], icon: KeyRound },
  { to: `${TECHNICAL_BASE_PATH}/documentacao`, label: 'Documentação', permissions: ['docs'], icon: BookOpen },
  { to: `${TECHNICAL_BASE_PATH}/admin`, label: 'Administração', permissions: ['admin'], icon: Settings }
];

export function canAccessPermissions(
  user: NavigationSessionUser | null | undefined,
  permissions: InternalPermission[]
): boolean {
  if (!user) return false;
  return permissions.some((permission) => user.permissions.includes(permission));
}

export function canAccessPath(user: NavigationSessionUser | null | undefined, pathname: string): boolean {
  if (pathname === `${TECHNICAL_BASE_PATH}/dashboard`) {
    return canAccessPermissions(user, ['dashboard']);
  }

  const route = APP_NAV_ITEMS.find((item) => (
    pathname === item.to || pathname.startsWith(`${item.to}/`)
  ));
  if (!route) {
    return false;
  }
  if (route.roles && (!user || !route.roles.includes(user.role))) {
    return false;
  }
  return canAccessPermissions(user, route.permissions);
}

export function defaultRouteForUser(user: NavigationSessionUser | null | undefined): string {
  if (!user) return '/app';
  const visible = APP_NAV_ITEMS.find((item) => {
    if (item.roles && !item.roles.includes(user.role)) return false;
    return canAccessPermissions(user, item.permissions);
  });
  return visible?.to ?? '/app';
}

export function visibleNavItemsForUser(user: NavigationSessionUser | null | undefined): AppNavItem[] {
  return APP_NAV_ITEMS.filter((item) => {
    if (item.roles && (!user || !item.roles.includes(user.role))) return false;
    return canAccessPermissions(user, item.permissions);
  });
}
