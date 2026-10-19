export type Version = [number, number, number];

/** Extrae "1.2.3" de etiquetas como "v2.8.0-build-20261019". */
export function parseVersion(value: string | undefined | null): Version | null {
  const match = String(value || '').match(/(\d+)\.(\d+)\.(\d+)/);
  if (!match) return null;
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

/** true si `candidate` es estrictamente más nueva que `current`. */
export function isNewer(candidate: Version | null, current: Version | null): boolean {
  if (!candidate || !current) return false;
  for (let i = 0; i < 3; i++) {
    if (candidate[i] !== current[i]) return candidate[i] > current[i];
  }
  return false;
}

export function formatVersion(version: Version | null): string {
  return version ? version.join('.') : '';
}
