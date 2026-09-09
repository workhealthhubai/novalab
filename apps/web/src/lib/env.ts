/** Browser-side configuration. Only VITE_* variables are embedded at build time. */
export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL ?? '/api',
  appName: import.meta.env.VITE_APP_NAME ?? 'OSGB Suite',
  /** ID card OCR: 'hybrid' (browser first, API as fallback), 'client' (browser only), 'server' (API only). */
  idScanMode:
    (['hybrid', 'client', 'server'] as const).find(
      (mode) => mode === import.meta.env.VITE_ID_SCAN_MODE,
    ) ?? 'hybrid',
} as const;
