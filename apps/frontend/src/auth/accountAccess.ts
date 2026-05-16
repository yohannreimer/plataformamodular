export const ACCOUNT_ACCESS_STORAGE_KEY = 'prymeira_account_access_v1';
export const ACCOUNT_ACCESS_CHANGED_EVENT = 'prymeira_account_access_changed';

export type AccountProductKey = 'orquestrador' | 'financeiro';

export type AccountProductAccess = {
  product_key: string;
  name: string;
  description: string | null;
  app_url: string;
  marketing_url: string | null;
  status: string;
  plan?: string;
  source?: string;
  limits?: Record<string, unknown>;
  seats_limit?: number;
  workspace_id?: string;
  workspace_role?: string;
  product_role?: string;
  allowed: boolean;
  reason: string;
  upgrade_url?: string;
};

export type AccountWorkspace = {
  id: string;
  name: string;
  type: string;
  role: string;
};

export type AccountAccessState = {
  customer: {
    id: string;
    email: string;
    name: string | null;
  } | null;
  workspace: AccountWorkspace | null;
  products: AccountProductAccess[];
};

function emitAccountAccessChanged() {
  window.dispatchEvent(new Event(ACCOUNT_ACCESS_CHANGED_EVENT));
}

function normalizeAccountAccessState(raw: unknown): AccountAccessState | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;
  const products = Array.isArray(source.products)
    ? source.products.filter((item): item is AccountProductAccess => (
      Boolean(item)
      && typeof item === 'object'
      && typeof (item as Record<string, unknown>).product_key === 'string'
      && typeof (item as Record<string, unknown>).name === 'string'
      && typeof (item as Record<string, unknown>).status === 'string'
      && typeof (item as Record<string, unknown>).allowed === 'boolean'
    ))
    : [];

  const customerSource = source.customer && typeof source.customer === 'object' && !Array.isArray(source.customer)
    ? source.customer as Record<string, unknown>
    : null;
  const workspaceSource = source.workspace && typeof source.workspace === 'object' && !Array.isArray(source.workspace)
    ? source.workspace as Record<string, unknown>
    : null;

  return {
    customer: customerSource && typeof customerSource.id === 'string' && typeof customerSource.email === 'string'
      ? {
        id: customerSource.id,
        email: customerSource.email,
        name: typeof customerSource.name === 'string' ? customerSource.name : null
      }
      : null,
    workspace: workspaceSource && typeof workspaceSource.id === 'string' && typeof workspaceSource.name === 'string'
      ? {
        id: workspaceSource.id,
        name: workspaceSource.name,
        type: typeof workspaceSource.type === 'string' ? workspaceSource.type : 'individual',
        role: typeof workspaceSource.role === 'string' ? workspaceSource.role : 'member'
      }
      : null,
    products
  };
}

export const accountAccessStore = {
  read(): AccountAccessState | null {
    const raw = window.localStorage.getItem(ACCOUNT_ACCESS_STORAGE_KEY);
    if (!raw) return null;
    try {
      return normalizeAccountAccessState(JSON.parse(raw));
    } catch {
      return null;
    }
  },
  save(state: AccountAccessState) {
    window.localStorage.setItem(ACCOUNT_ACCESS_STORAGE_KEY, JSON.stringify(state));
    emitAccountAccessChanged();
  },
  clear() {
    window.localStorage.removeItem(ACCOUNT_ACCESS_STORAGE_KEY);
    emitAccountAccessChanged();
  }
};

export function findAccountProduct(state: AccountAccessState | null | undefined, productKey: AccountProductKey) {
  return state?.products.find((product) => product.product_key === productKey) ?? null;
}

export function hasAccountProductAccess(state: AccountAccessState | null | undefined, productKey: AccountProductKey): boolean {
  const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env;
  if (!state && env?.MODE === 'test') return true;
  return findAccountProduct(state, productKey)?.allowed === true;
}
