import fs from 'node:fs';
import { globalConfigFile } from '../paths.js';
import { linkTool, unlinkTool, SUPPORTED_TOOLS } from '../links.js';

export function runLink(opts: {
  home: string;
  add?: string[];
  remove?: string[];
}): { linked: string[]; unlinked: string[]; tools: string[] } {
  const known = SUPPORTED_TOOLS as readonly string[];
  for (const t of [...(opts.add ?? []), ...(opts.remove ?? [])]) {
    if (!known.includes(t)) throw new Error(`Unknown tool: ${t}`);
  }

  const cfgPath = globalConfigFile(opts.home);
  let cfg: any = {};
  if (fs.existsSync(cfgPath)) {
    try { cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8')); }
    catch (err) { throw new Error(`Malformed config.json: ${err instanceof Error ? err.message : String(err)}`); }
  }
  const set = new Set<string>(Array.isArray(cfg.tools) ? cfg.tools : []);

  const linked: string[] = [];
  const unlinked: string[] = [];
  for (const t of opts.add ?? []) { linkTool('global', t, opts.home); set.add(t); linked.push(t); }
  for (const t of opts.remove ?? []) { unlinkTool('global', t, opts.home); set.delete(t); unlinked.push(t); }

  const tools = [...set].sort();
  cfg.tools = tools;
  fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n');
  return { linked, unlinked, tools };
}
