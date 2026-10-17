/** Exact HTTP origins only. Do not interpolate unvalidated configuration into CSP. */
export function parseAllowedOrigins(value: string): string[] {
  const origins = value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  if (!origins.length) throw new Error('Configuración no válida: ALLOWED_ORIGINS');
  return [
    ...new Set(
      origins.map((origin) => {
        const url = new URL(origin);
        if (
          !['http:', 'https:'].includes(url.protocol) ||
          url.origin !== origin ||
          url.username ||
          url.password ||
          url.search ||
          url.hash
        )
          throw new Error('Configuración no válida: ALLOWED_ORIGINS');
        return origin;
      }),
    ),
  ];
}

export function contentSecurityPolicy(origins: readonly string[]): string {
  const connections = origins.flatMap((origin) => [origin, origin.replace(/^http/, 'ws')]);
  return `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self'; connect-src 'self' ${connections.join(' ')}; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; object-src 'none'`;
}
