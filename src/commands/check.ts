import fs from 'node:fs';
import path from 'node:path';
import { compose } from '../generator.js';
import { getAdapters } from '../adapters.js';
import { buildLayers } from '../layers.js';

export function runCheck(opts: {
  root: string;
  home?: string;
  adapters?: string[];
}): { ok: boolean; drift: string[]; missing: string[] } {
  const adapters = getAdapters(opts.adapters ?? ['claude', 'agents']);
  const body = compose(buildLayers(opts.root, opts.home));
  const drift: string[] = [];
  const missing: string[] = [];
  for (const a of adapters) {
    const p = path.join(opts.root, a.filename);
    const expected = a.wrap ? a.wrap(body) : body;
    if (!fs.existsSync(p)) { missing.push(a.filename); continue; }
    if (fs.readFileSync(p, 'utf8') !== expected) drift.push(a.filename);
  }
  return { ok: drift.length === 0 && missing.length === 0, drift, missing };
}
