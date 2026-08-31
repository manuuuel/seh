import fs from 'node:fs';
import path from 'node:path';

/**
 * How one agent loads plugins. `detect` keys off that agent's own manifest
 * convention, so any plugin following it is wired — no per-plugin knowledge.
 * Returning null means the plugin ships no adapter for this agent.
 */
export type PluginAdapter = {
  agent: string;
  targetDir: (home: string) => string;
  detect: (pluginRoot: string) => string | null;
};

export type DetectedAdapter = {
  agent: string;
  subpath: string;
  targetDir: (home: string) => string;
};

const has = (...parts: string[]): boolean => fs.existsSync(path.join(...parts));

function readJson(file: string): Record<string, unknown> | null {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

const normalize = (p: string): string => {
  const rel = path.normalize(p).replace(/^\.\//, '').replace(/\/+$/, '');
  return rel === '' || rel === '.' ? '.' : rel;
};

/**
 * pi resolves a symlinked extension directory itself: package.json "pi.extensions"
 * first, then index.ts / index.js (dist/core/extensions/loader.js).
 */
function detectPi(root: string): string | null {
  const pkg = readJson(path.join(root, 'package.json'));
  const declared = (pkg?.['pi'] as { extensions?: unknown } | undefined)?.extensions;
  if (Array.isArray(declared) && declared.some((e) => typeof e === 'string' && has(root, e))) return '.';
  return has(root, 'index.ts') || has(root, 'index.js') ? '.' : null;
}

const OPENCODE_PLUGIN_DIRS = ['.opencode/plugin', '.opencode/plugins'];
const OPENCODE_EXTS = ['.ts', '.js', '.mjs'];

/** OpenCode loads plugin *files*: the packaged entrypoint, else the one under .opencode/. */
function detectOpencode(root: string): string | null {
  const main = readJson(path.join(root, 'package.json'))?.['main'];
  if (typeof main === 'string') {
    const rel = normalize(main);
    if (rel.startsWith('.opencode/') && has(root, rel)) return rel;
  }
  for (const dir of OPENCODE_PLUGIN_DIRS) {
    if (!has(root, dir)) continue;
    const files = fs
      .readdirSync(path.join(root, dir), { withFileTypes: true })
      .filter((e) => !e.isDirectory() && OPENCODE_EXTS.includes(path.extname(e.name)))
      .map((e) => `${dir}/${e.name}`);
    if (files.length === 1) return files[0]!;
  }
  return null;
}

export const PLUGIN_ADAPTERS: PluginAdapter[] = [
  {
    agent: 'claude',
    targetDir: (home) => path.join(home, '.claude', 'skills'),
    detect: (root) => (has(root, '.claude-plugin', 'plugin.json') ? '.' : null),
  },
  {
    agent: 'gemini',
    targetDir: (home) => path.join(home, '.gemini', 'extensions'),
    detect: (root) => (has(root, 'gemini-extension.json') ? '.' : null),
  },
  {
    agent: 'pi',
    targetDir: (home) => path.join(home, '.pi', 'agent', 'extensions'),
    detect: detectPi,
  },
  {
    agent: 'opencode',
    targetDir: (home) => path.join(home, '.config', 'opencode', 'plugins'),
    detect: detectOpencode,
  },
  {
    agent: 'agents',
    targetDir: (home) => path.join(home, '.agents', 'plugins'),
    detect: (root) => (has(root, '.agents', 'plugins', 'marketplace.json') ? '.' : null),
  },
];

export const PLUGIN_AGENTS = PLUGIN_ADAPTERS.map((a) => a.agent);

/** Adapters this plugin directory ships, with per-agent overrides taking precedence. */
export function detectAdapters(
  pluginRoot: string,
  overrides: Record<string, string> = {},
): DetectedAdapter[] {
  const found: DetectedAdapter[] = [];
  for (const adapter of PLUGIN_ADAPTERS) {
    const override = overrides[adapter.agent];
    const subpath = override !== undefined ? normalize(override) : adapter.detect(pluginRoot);
    if (subpath === null) continue;
    found.push({ agent: adapter.agent, subpath, targetDir: adapter.targetDir });
  }
  return found;
}

/** Link name in the agent's plugin dir: the plugin name, keeping a file subpath's extension. */
export function linkNameFor(pluginName: string, subpath: string): string {
  const ext = subpath === '.' ? '' : path.extname(subpath);
  return `${pluginName}${ext}`;
}
