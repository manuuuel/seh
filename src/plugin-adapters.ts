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
   * Files this agent loads as modules, relative to the plugin root. Only these
   * need npm dependencies installed — an unrelated component in the same repo
   * (a bundled MCP server, say) is none of this agent's business.
   */
  entrypoints?: (pluginRoot: string) => string[];
  /** The host's own install command for a spec, used when dependencies are missing. */
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
function piEntrypoints(root: string): string[] {
  const pkg = readJson(path.join(root, 'package.json'));
  const declared = (pkg?.['pi'] as { extensions?: unknown } | undefined)?.extensions;
  if (Array.isArray(declared)) {
    const resolved = declared
      .filter((e): e is string => typeof e === 'string')
      .map((e) => safeSubpath(e))
      .filter((rel): rel is string => rel !== null && has(root, rel));
    if (resolved.length > 0) return resolved;
  }
  for (const index of ['index.ts', 'index.js']) {
    if (has(root, index)) return [index];
  }
  return [];
}

const detectPi = (root: string): string | null => (piEntrypoints(root).length > 0 ? '.' : null);

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
    entrypoints: piEntrypoints,
    hostInstall: (spec) => `pi install ${spec}`,
  },
  {
    agent: 'opencode',
    targetDir: (home) => path.join(home, '.config', 'opencode', 'plugins'),
    detect: detectOpencode,
    entrypoints: (root) => {
      const sub = detectOpencode(root);
      return sub === null ? [] : [sub];
    },
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
 * Every `package.json` governing an entrypoint: its own directory and each
 * ancestor up to the plugin root. A workspace monorepo declares its
 * dependencies in the inner one, a flat package in the root one.
 */
function manifestsGoverning(root: string, entrypoint: string): string[] {
  const manifests: string[] = [];
  let dir = path.dirname(path.join(root, entrypoint));
  const stop = path.resolve(root);
  for (;;) {
    const manifest = path.join(dir, 'package.json');
    if (fs.existsSync(manifest)) manifests.push(manifest);
    if (path.resolve(dir) === stop) break;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return manifests;
}

/**
 * Non-null when the code an agent would load needs npm dependencies that are
 * not installed. A symlink shares files, not `node_modules`, so the plugin
 * would fail on its first import. Only `dependencies` count: peers come from
 * the host, and dev dependencies never load at runtime.
 */
export function needsHostInstall(
  pluginRoot: string,
  entrypoints: string[],
): { spec: string; deps: number } | null {
  if (entrypoints.length === 0) return null;
  const pkg = readJson(path.join(pluginRoot, 'package.json'));
  if (!pkg) return null;
  if (fs.existsSync(path.join(pluginRoot, 'node_modules'))) return null;

  const seen = new Set<string>();
  let deps = 0;
  for (const entrypoint of entrypoints) {
    for (const manifest of manifestsGoverning(pluginRoot, entrypoint)) {
      if (seen.has(manifest)) continue;
      seen.add(manifest);
      const declared = readJson(manifest)?.['dependencies'];
      if (declared && typeof declared === 'object') deps += Object.keys(declared).length;
    }
  }
  if (deps === 0) return null;

  const name = typeof pkg['name'] === 'string' && pkg['name'] ? pkg['name'] : path.basename(pluginRoot);
  return { spec: name, deps };
}

/**
 * The dependency situation of a plugin on disk: which agents load it as a
 * module, and how many uninstalled dependencies stand in the way. Callers turn
 * this into instructions — the wording differs for a vendored copy and a
 * referenced source.
 */
export function pendingDependencies(
  pluginRoot: string,
  paths?: Record<string, string>,
): { spec: string; deps: number; adapters: DetectedAdapter[] } | null {
  const adapters = detectAdapters(pluginRoot, paths).filter((a) => a.entrypoints);
  const entrypoints = adapters.flatMap((a) => a.entrypoints!(pluginRoot));
  const pending = needsHostInstall(pluginRoot, entrypoints);
  return pending ? { ...pending, adapters } : null;
}

/** Link name in the agent's plugin dir: the plugin name, keeping a file subpath's extension. */
export function linkNameFor(pluginName: string, subpath: string): string {
  const ext = subpath === '.' ? '' : path.extname(subpath);
  return `${pluginName}${ext}`;
}
