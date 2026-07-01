import fs from 'node:fs';
import path from 'node:path';
import { compose } from '../generator.js';
import { getAdapters } from '../adapters.js';
import { buildLayers } from '../layers.js';
import { lockFile } from '../paths.js';

const VERSION = '0.1.0';

export function runSync(opts: {
  root: string;
  home?: string;
  adapters?: string[];
}): { written: string[] } {
  const adapterNames = opts.adapters ?? ['claude', 'agents'];
  const adapters = getAdapters(adapterNames);

  const body = compose(buildLayers(opts.root, opts.home));
  const written: string[] = [];
  for (const a of adapters) {
    const out = a.wrap ? a.wrap(body) : body;
    fs.writeFileSync(path.join(opts.root, a.filename), out);
    written.push(a.filename);
  }

  const lock = { version: VERSION, adapters: adapterNames, generatedAt: new Date().toISOString() };
  fs.writeFileSync(lockFile(opts.root), JSON.stringify(lock, null, 2) + '\n');
  written.push('harness.lock');

  return { written };
}
