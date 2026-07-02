import fs from 'node:fs';
import { globalConfigFile } from '../paths.js';
import { linkTool, unlinkTool, isLinked, TOOL_TARGETS } from '../links.js';

export function runLink(opts: {
  home: string;
  add?: string[];
  remove?: string[];
}): { linked: string[]; unlinked: string[]; tools: string[] } {
  const linked: string[] = [];
  const unlinked: string[] = [];
  for (const t of opts.add ?? []) { linkTool(t, opts.home); linked.push(t); }
  for (const t of opts.remove ?? []) { unlinkTool(t, opts.home); unlinked.push(t); }

  const tools = Object.keys(TOOL_TARGETS).filter((t) => isLinked(t, opts.home));
  const cfgPath = globalConfigFile(opts.home);
  const cfg = fs.existsSync(cfgPath) ? JSON.parse(fs.readFileSync(cfgPath, 'utf8')) : {};
  cfg.tools = tools;
  fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 2) + '\n');

  return { linked, unlinked, tools };
}
