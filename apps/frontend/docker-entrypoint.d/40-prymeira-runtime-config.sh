#!/bin/sh
set -eu

jq -n \
  --arg viteClerkPublishableKey "${VITE_CLERK_PUBLISHABLE_KEY:-${CLERK_PUBLISHABLE_KEY:-}}" \
  --arg clerkPublishableKey "${CLERK_PUBLISHABLE_KEY:-}" \
  --arg prymeiraHubUrl "${VITE_PRYMEIRA_HUB_URL:-https://hub.prymeiradigital.com.br}" \
  '{
    VITE_CLERK_PUBLISHABLE_KEY: $viteClerkPublishableKey,
    CLERK_PUBLISHABLE_KEY: $clerkPublishableKey,
    VITE_PRYMEIRA_HUB_URL: $prymeiraHubUrl
  }' \
  | sed '1s/^/window.__PRYMEIRA_CONFIG__ = /;$s/$/;/' \
  > /usr/share/nginx/html/config.js
