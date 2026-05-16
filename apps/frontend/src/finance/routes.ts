import { FINANCE_BASE_PATH } from '../core/modules';

const LEGACY_FINANCE_BASE_PATH = '/financeiro';

export function financePath(path = '') {
  if (!path) return FINANCE_BASE_PATH;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${FINANCE_BASE_PATH}${normalizedPath}`;
}

export function normalizeFinancePath(href: string) {
  if (
    href === LEGACY_FINANCE_BASE_PATH
    || href.startsWith(`${LEGACY_FINANCE_BASE_PATH}/`)
    || href.startsWith(`${LEGACY_FINANCE_BASE_PATH}?`)
    || href.startsWith(`${LEGACY_FINANCE_BASE_PATH}#`)
  ) {
    return `${FINANCE_BASE_PATH}${href.slice(LEGACY_FINANCE_BASE_PATH.length)}`;
  }

  return href;
}
