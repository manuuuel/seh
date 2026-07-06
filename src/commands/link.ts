import fs from 'node:fs';
import { globalConfigFile } from '../paths.js';
import { linkAgent, unlinkAgent, SUPPORTED_AGENTS, readGlobalConfig } from '../links.js';

export function runLink(opts: {
  home: string;
  add?: string[];
  remove?: string[];
}): { linked: string[]; unlinked: string[]; agents: string[] } {
  const known = SUPPORTED_AGENTS as readonly string[];
  for (const a of [...(opts.add ?? []), ...(opts.remove ?? [])]) {
    if (!known.includes(a)) throw new Error(`Unknown agent: ${a}`);
  }

  const cfgPath = globalConfigFile(opts.home);
  const cfg = readGlobalConfig(opts.home);
  const set = new Set<string>(cfg.agents);

  const linked: string[] = [];
  const unlinked: string[] = [];
  for (const a of opts.add ?? []) { linkAgent('global', a, opts.home); set.add(a); linked.push(a); }
  for (const a of opts.remove ?? []) { unlinkAgent('global', a, opts.home); set.delete(a); unlinked.push(a); }

  const agents = [...set].sort();
  fs.writeFileSync(cfgPath, JSON.stringify({ ...cfg, agents }, null, 2) + '\n');
  return { linked, unlinked, agents };
}
