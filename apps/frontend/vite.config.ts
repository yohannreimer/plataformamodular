import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const useLocalClerkMock = env.VITE_LOCAL_AUTH_BYPASS === '1' && mode !== 'production';

  return {
    plugins: [react()],
    resolve: {
      alias: useLocalClerkMock
        ? {
            '@clerk/clerk-react': fileURLToPath(new URL('./src/auth/mockClerk.tsx', import.meta.url))
          }
        : {}
    },
    server: {
      port: 5173
    },
    test: {
      environment: 'jsdom',
      setupFiles: './src/test/setup.ts'
    }
  };
});
