import fs from 'node:fs';
import { globalDir, globalIndexFile, globalConfigFile } from '../paths.js';
import { globalModules, globalPreamble } from '../catalog.js';
import { buildDocument } from '../index-emitter.js';

// Global sections, craftsmanship first (a forced, prominent principle), then the
// rest in filename order.
function orderedGlobalSections(): string[] {
  const mods = globalModules();
  const craft = mods.filter((m) => m.name === 'craftsmanship');
  const rest = mods.filter((m) => m.name !== 'craftsmanship');
  return [...craft, ...rest].map((m) => m.content);
}

export function buildGlobalAgentsMd(): string {
  return buildDocument(globalPreamble(), orderedGlobalSections());
}

export function runInitGlobal(opts: {
  home: string;
  tools?: string[];
  force?: boolean;
}): { created: string[]; skipped: string[] } {
  const created: string[] = [];
  const skipped: string[] = [];
  fs.mkdirSync(globalDir(opts.home), { recursive: true });

  // The global harness is a SINGLE self-contained file (not an index).
  const idx = globalIndexFile(opts.home);
  if (fs.existsSync(idx) && !opts.force) {
    skipped.push('AGENTS.md');
  } else {
    fs.writeFileSync(idx, buildDocument(globalPreamble(), orderedGlobalSections()));
    created.push('AGENTS.md');
  }

  const cfg = globalConfigFile(opts.home);
  if (fs.existsSync(cfg) && !opts.force) {
    skipped.push('config.json');
  } else {
    fs.writeFileSync(cfg, JSON.stringify({ tools: opts.tools ?? [] }, null, 2) + '\n');
    created.push('config.json');
  }

  return { created, skipped };
}
