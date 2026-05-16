import { expect, test } from 'vitest';
import {
  defaultModulePathForUser,
  moduleById,
  visibleModulesForUser
} from './modules';
import type { InternalSessionUser } from '../auth/session';

function user(role: InternalSessionUser['role'], permissions: InternalSessionUser['permissions']): InternalSessionUser {
  return {
    id: `user-${role}`,
    username: role,
    display_name: role,
    role,
    permissions
  };
}

test('supremo with finance and technical permissions sees both modules', () => {
  const currentUser = user('supremo', ['calendar', 'cohorts', 'finance.read']);

  expect(visibleModulesForUser(currentUser).map((module) => module.id)).toEqual(['technical', 'finance']);
});

test('technical user without finance permission sees only technical module', () => {
  const currentUser = user('custom', ['calendar', 'cohorts', 'clients']);

  expect(visibleModulesForUser(currentUser).map((module) => module.id)).toEqual(['technical']);
});

test('module registry exposes default entry paths', () => {
  expect(moduleById('finance')?.entryPath).toBe('/m/financeiro');
  expect(moduleById('finance')?.defaultPath).toBe('/m/financeiro/overview');
  expect(moduleById('technical')?.entryPath).toBe('/m/tecnico');
  expect(moduleById('technical')?.defaultPath).toBe('/m/tecnico/calendario');
});

test('default module path prefers the first module the user can access', () => {
  const technicalUser = user('custom', ['clients']);
  const financeUser = user('supremo', ['finance.read']);
  const emptyUser = user('custom', []);

  expect(defaultModulePathForUser(technicalUser)).toBe('/m/tecnico');
  expect(defaultModulePathForUser(financeUser)).toBe('/m/financeiro');
  expect(defaultModulePathForUser(emptyUser)).toBe('/app');
});
