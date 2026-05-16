type ClerkTokenGetter = () => Promise<string | null>;

let clerkTokenGetter: ClerkTokenGetter | null = null;

export function setClerkTokenGetter(getter: ClerkTokenGetter | null) {
  clerkTokenGetter = getter;
}

export async function readClerkToken(): Promise<string | null> {
  if (!clerkTokenGetter) return null;
  return clerkTokenGetter();
}
