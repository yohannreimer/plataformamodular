type RuntimeConfig = Record<string, string | undefined>;

declare global {
  interface Window {
    __PRYMEIRA_CONFIG__?: RuntimeConfig;
  }
}

const env = (import.meta as unknown as { env?: RuntimeConfig }).env ?? {};

export function readRuntimeConfig(key: string) {
  return window.__PRYMEIRA_CONFIG__?.[key] ?? env[key];
}

