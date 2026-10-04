import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
/** Sender allowlisting is also mandatory; this preflight does not replace its DNS pinning. */
export function callbackShape(url: string, allowlist: readonly string[]): URL {
  const parsed = new URL(url);
  if (
    !allowlist.includes(url) ||
    parsed.protocol !== 'https:' ||
    (parsed.port && parsed.port !== '443') ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash ||
    parsed.href !== url
  )
    throw new Error('CALLBACK_NOT_ALLOWLISTED');
  return parsed;
}
export function publicUnicast(address: string): boolean {
  if (isIP(address) === 4) {
    const p = address.split('.').map(Number);
    const a = p[0]!,
      b = p[1]!,
      c = p[2]!;
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 168 || b === 0 || (b === 88 && c === 99))) ||
      (a === 198 && (b === 18 || b === 19 || (b === 51 && c === 100))) ||
      (a === 203 && b === 0 && c === 113)
    );
  }
  if (isIP(address) === 6) {
    const value = new URL('http://[' + address + ']/').hostname.slice(1, -1).toLowerCase();
    const parts = value.split(':');
    const first = parseInt(parts[0]!, 16),
      second = parseInt(parts[1] || '0', 16);
    return (
      /^[23][0-9a-f]{3}:/.test(value) &&
      !(first === 0x2001 && (second < 0x200 || second === 0xdb8)) &&
      !value.startsWith('3fff:') &&
      !value.startsWith('2002:')
    );
  }
  return false;
}
export async function validatePublicCallback(url: string, allowlist: readonly string[]) {
  const parsed = callbackShape(url, allowlist);
  const addresses = await lookup(parsed.hostname.replace(/^\[|\]$/g, ''), { all: true });
  if (!addresses.length || addresses.some((a) => !publicUnicast(a.address)))
    throw new Error('CALLBACK_NOT_PUBLIC');
}
