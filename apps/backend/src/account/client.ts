export type AccountProductKey = 'orquestrador' | 'financeiro';

export type AccountAccessDecision = {
  allowed: boolean;
  product_key: string;
  status: string;
  plan?: string;
  source?: string;
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
  products: Array<{
    product_key: string;
    name: string;
    description: string | null;
    app_url: string;
    marketing_url: string | null;
    status: string;
    plan?: string;
    allowed: boolean;
    reason: string;
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
  return accountRequest<{ customer_id: string; clerk_user_id: string; email: string }>(
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
