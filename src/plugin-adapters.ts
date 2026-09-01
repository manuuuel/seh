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
  /**
   * True when the adapter this agent loads is a module entrypoint, so the
   * plugin's npm dependencies must already be installed for it to import.
   * Manifest-based adapters (a plugin.json, an extension manifest) do not.
   */
  loadsModule?: boolean;
  /** The host's own install command for a package spec, shown when deps are missing. */
  hostInstall?: (spec: string) => string;
};

/** An adapter this plugin ships, carrying the full row plus where it lives. */
export type DetectedAdapter = PluginAdapter & { subpath: string };

const has = (...parts: string[]): boolean => fs.existsSync(path.join(...parts));

function readJson(file: string): Record<string, unknown> | null {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * A subpath is untrusted input: it comes from a plugin's own manifest or from
 * harness.json, which travels between machines. Anything absolute or escaping
 * the plugin directory is rejected rather than symlinked.
 */
function safeSubpath(p: string): string | null {
  // Validate in POSIX terms on every platform: a Windows separator, drive or UNC
  // prefix must not slip past the traversal check on a POSIX host, or vice versa.
  const unified = p.replace(/\\/g, '/');
  if (path.isAbsolute(p) || unified.startsWith('/') || /^[a-zA-Z]:/.test(unified)) return null;
  const rel = path.posix.normalize(unified).replace(/^\.\//, '').replace(/\/+$/, '');
  if (rel === '' || rel === '.') return '.';
  return rel.split('/').includes('..') ? null : rel;
}

/**
 * pi resolves a symlinked extension directory itself: package.json "pi.extensions"
 * first, then index.ts / index.js (dist/core/extensions/loader.js).
 */
function detectPi(root: string): string | null {
  const pkg = readJson(path.join(root, 'package.json'));
  const declared = (pkg?.['pi'] as { extensions?: unknown } | undefined)?.extensions;
  const resolvable = (e: unknown): boolean => {
    if (typeof e !== 'string') return false;
    const rel = safeSubpath(e);
    return rel !== null && has(root, rel);
  };
  if (Array.isArray(declared) && declared.some(resolvable)) return '.';
  return has(root, 'index.ts') || has(root, 'index.js') ? '.' : null;
}

const OPENCODE_PLUGIN_DIRS = ['.opencode/plugin', '.opencode/plugins'];
const OPENCODE_EXTS = ['.ts', '.js', '.mjs'];

/** OpenCode loads plugin *files*: the packaged entrypoint, else the one under .opencode/. */
function detectOpencode(root: string): string | null {
  const main = readJson(path.join(root, 'package.json'))?.['main'];
  if (typeof main === 'string') {
    const rel = safeSubpath(main);
    if (rel !== null && rel.startsWith('.opencode/') && has(root, rel)) return rel;
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
    loadsModule: true,
    hostInstall: (spec) => `pi install npm:${spec}`,
  },
  {
    agent: 'opencode',
    targetDir: (home) => path.join(home, '.config', 'opencode', 'plugins'),
    detect: detectOpencode,
    loadsModule: true,
    hostInstall: (spec) => `add "${spec}" to the "plugin" array in ~/.config/opencode/opencode.json`,
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
    let subpath: string | null;
    if (override !== undefined) {
      subpath = safeSubpath(override);
      if (subpath === null) {
        throw new Error(
          `Invalid path override '${override}' for agent '${adapter.agent}': ` +
          `it points outside the plugin directory.`,
        );
      }
    } else {
      subpath = adapter.detect(pluginRoot);
    }
    if (subpath === null) continue;
    found.push({ ...adapter, subpath });
  }
  return found;
}

/**
 * Non-null when a plugin declares npm dependencies that are not installed.
 * A symlink cannot satisfy them — the host's own installer must, since it also
 * resolves the peer dependencies the agent provides itself. Only `dependencies`
 * count: peers come from the host, dev deps are irrelevant at runtime.
 */
export function needsHostInstall(pluginRoot: string): { spec: string; deps: number } | null {
  const pkg = readJson(path.join(pluginRoot, 'package.json'));
  if (!pkg) return null;
  const deps = pkg['dependencies'];
  const count = deps && typeof deps === 'object' ? Object.keys(deps).length : 0;
  if (count === 0) return null;
  if (fs.existsSync(path.join(pluginRoot, 'node_modules'))) return null;
  const name = typeof pkg['name'] === 'string' && pkg['name'] ? pkg['name'] : path.basename(pluginRoot);
  return { spec: name, deps: count };
}

/** Link name in the agent's plugin dir: the plugin name, keeping a file subpath's extension. */
export function linkNameFor(pluginName: string, subpath: string): string {
  const ext = subpath === '.' ? '' : path.extname(subpath);
  return `${pluginName}${ext}`;
}
