/** Wird beim Build von vite.config.ts eingesetzt */
declare const __APP_VERSION__: {
  /** Commit + Build-Zeit, identisch in /version.json */
  buildId: string;
  version: string;
  commit: string;
  /** Build enthielt uncommittete Änderungen (lokaler Stand) */
  dirty: boolean;
  builtAt: string;
};
