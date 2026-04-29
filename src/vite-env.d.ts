/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_USE_REAL_API?: string;
  readonly VITE_HIDE_DEMO_BANNER?: string;
  /** Agency login URL when forcing real API without a session (defaults to client-portal agency mode). */
  readonly VITE_LOGIN_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
