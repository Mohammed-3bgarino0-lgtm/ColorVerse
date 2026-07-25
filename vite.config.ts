import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const isGitHubPages = process.env.GITHUB_ACTIONS === 'true';

  return {
    base: isGitHubPages ? '/ColorVerse/' : '/',
    plugins: [react()],
    server: {
      host: '0.0.0.0',
      port: Number(env.PORT || 3000),
      proxy: {
        '/api': 'http://localhost:3001',
      },
    },
    preview: {
      host: '0.0.0.0',
      port: Number(env.PORT || 4173),
    },
  };
});
