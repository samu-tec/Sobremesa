import { isIP } from 'node:net';

function normalizeIp(value: string): string | undefined {
  const address = value.trim().toLowerCase();
  const mappedIpv4 = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(address)?.[1];
  if (mappedIpv4 && isIP(mappedIpv4) === 4) return mappedIpv4;
  return isIP(address) ? address : undefined;
}

export function parseTrustedCloudflareIps(value: string | undefined): Set<string> {
  const configured = (value ?? '')
    .split(',')
    .map((address) => address.trim())
    .filter(Boolean);
  const addresses = new Set<string>();

  for (const address of configured) {
    const normalized = normalizeIp(address);
    if (!normalized) throw new Error('Configuración no válida: TRUSTED_CLOUDFLARE_IPS');
    addresses.add(normalized);
  }

  return addresses;
}

export function resolveClientIp(
  remoteAddress: string | undefined,
  cloudflareAddress: string | string[] | undefined,
  trustedCloudflareIps: ReadonlySet<string>,
): string {
  const remoteIp = remoteAddress ? normalizeIp(remoteAddress) : undefined;
  const remote = remoteIp ?? 'unknown';
  if (!remoteIp || !trustedCloudflareIps.has(remoteIp) || typeof cloudflareAddress !== 'string')
    return remote;

  return normalizeIp(cloudflareAddress) ?? remote;
}
