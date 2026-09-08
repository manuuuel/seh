import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let cached: string | null = null;

/**
 * The CLI version, read from package.json — the single source of truth.
 *
 * Resolves `../package.json` relative to this module, which holds both when
 * running from source (`src/version.ts`) and from the bundle (`dist/cli.js`),
 * exactly as `assetsDir()` resolves `../assets`. npm always ships package.json
 * in the tarball, regardless of the `files` field.
 */
export function version(): string {
  if (cached !== null) return cached;
  const here = path.dirname(fileURLToPath(import.meta.url));
  const manifest = JSON.parse(fs.readFileSync(path.resolve(here, '..', 'package.json'), 'utf8'));
  cached = manifest.version as string;
  return cached;
}
