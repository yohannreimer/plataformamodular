export type AccountProductKey = 'orquestrador' | 'financeiro';

export type AccountWorkspace = {
  id: string;
  name: string;
  type: string;
  role: string;
};

export type AccountAccessDecision = {
  allowed: boolean;
  workspace_id?: string;
  workspace_role?: string;
  product_key: string;
  product_role?: string;
  status: string;
  plan?: string;
  source?: string;
  seats_limit?: number;
  limits?: Record<string, unknown>;
  reason: string;
  upgrade_url?: string;
};

export type AccountMeProductsResponse = {
  customer: {
    id: string;
    email: string;
    name: string | null;
  } | null;
  workspace: AccountWorkspace | null;
  products: Array<{
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
  }>;
};

export type AccountSyncCustomerInput = {
  clerk_user_id: string;
  email: string;
  name?: string;
};

function accountApiBaseUrl() {
  return (process.env.PRYMEIRA_ACCOUNT_API_URL ?? 'http://localhost:3001').replace(/\/$/, '');
}

async function accountRequest<T>(path: string, clerkToken: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${accountApiBaseUrl()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${clerkToken}`,
      ...(init?.headers ?? {})
    }
  });

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(`Prymeira Account API ${response.status}: ${text || response.statusText}`);
  }

  return response.json() as Promise<T>;
}

export async function syncAccountCustomer(clerkToken: string, input: AccountSyncCustomerInput) {
  return accountRequest<{
    customer_id: string;
    clerk_user_id: string;
    email: string;
    workspace: AccountWorkspace;
  }>(
    '/customers/sync',
    clerkToken,
    {
      method: 'POST',
      body: JSON.stringify(input)
    }
  );
}

export async function readAccountProducts(clerkToken: string) {
  return accountRequest<AccountMeProductsResponse>('/me/products', clerkToken);
}

export async function checkAccountProductAccess(clerkToken: string, productKey: AccountProductKey) {
  return accountRequest<AccountAccessDecision>(
    `/access-check?product_key=${encodeURIComponent(productKey)}`,
    clerkToken
  );
}
