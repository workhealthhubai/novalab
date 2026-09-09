import { fileURLToPath, URL } from 'node:url';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';
import { defineConfig } from 'vitest/config';

/**
 * Local development without Nginx: besides `/api`, mirror the edge routes the OHIF viewer needs
 * (`/viewer` → OHIF container, its root-level bundle files, and `/dicom-web` → Orthanc with the
 * basic-auth header injected from the repo `.env`). The DICOMweb cookie check that Nginx performs
 * via the API is skipped here on purpose — dev only.
 */
function viewerProxy(rootEnv: Record<string, string>) {
  const ohif = process.env.VITE_DEV_OHIF_PROXY ?? 'http://localhost:3001';
  const orthanc = process.env.VITE_DEV_ORTHANC_PROXY ?? 'http://localhost:8042';
  const basicAuth = rootEnv.ORTHANC_BASIC_AUTH_B64;
  return {
    '/dicom-web': {
      target: orthanc,
      changeOrigin: true,
      ...(basicAuth ? { headers: { Authorization: `Basic ${basicAuth}` } } : {}),
    },
    '^/viewer(/|$)': {
      target: ohif,
      changeOrigin: true,
      rewrite: (path: string) => path.replace(/^\/viewer/, '') || '/',
    },
    '^/(app-config\\.js|manifest\\.json|google\\.js|es6-shim\\.min\\.js|polyfill\\.min\\.js|oidc-client\\.min\\.js|silent-refresh\\.html|ohif-logo[^/]*\\.svg|[^/]+\\.bundle\\.[0-9a-f]+\\.js|[^/]+\\.bundle\\.css|[0-9]+\\.css|[0-9a-f]+\\.wasm|[0-9a-f]+\\.woff2?)$':
      {
        target: ohif,
        changeOrigin: true,
      },
    '^/(assets|customizations|dicom-microscopy-viewer|ort|locales)/': {
      target: ohif,
      changeOrigin: true,
    },
  };
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    port: Number(process.env.WEB_PORT ?? 5173),
    host: true,
    proxy: {
      // Local development without Nginx: forward API calls to the NestJS dev server.
      '/api': {
        target: process.env.VITE_DEV_API_PROXY ?? 'http://localhost:3000',
        changeOrigin: true,
      },
      ...viewerProxy(loadEnv(mode, fileURLToPath(new URL('../..', import.meta.url)), '')),
    },
  },
  build: {
    // OHIF's bundle is served from the site root under `/assets/` (see infrastructure/nginx).
    assetsDir: 'static',
    sourcemap: false,
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
}));
