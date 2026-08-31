import fs from 'node:fs';
import { packagePluginDir, packagePluginsDir } from '../paths.js';
import type { PluginPaths } from '../types.js';
import { addToGitignore, cloneAt, requireHarness, writeHarness } from '../units.js';
import { detectAdapters } from '../plugin-adapters.js';

/** Agents this plugin ships an adapter for, or [] when its files are not on disk. */
function coverage(packagePath: string, name: string, paths?: PluginPaths): string[] {
  const dir = packagePluginDir(packagePath, name);
  if (!fs.existsSync(dir)) return [];
  return detectAdapters(dir, paths).map((a) => a.agent);
}

export function runPluginsAdd(opts: {
  url: string;
  pluginName: string;
  type: 'vendor' | 'reference';
  ref?: string;
  packagePath: string;
  force?: boolean;
  paths?: PluginPaths;
}): void {
  const pluginDir = packagePluginDir(opts.packagePath, opts.pluginName);

  if (fs.existsSync(pluginDir) && !opts.force) {
    throw new Error(`Plugin '${opts.pluginName}' already exists at ${pluginDir}. Use --force to overwrite.`);
  }

  const harness = requireHarness(opts.packagePath);
  if (!harness.plugins) harness.plugins = {};
  const paths = opts.paths && Object.keys(opts.paths).length > 0 ? { paths: opts.paths } : {};

  if (opts.type === 'vendor') {
    cloneAt(opts.url, opts.ref ?? 'main', pluginDir);
    harness.plugins[opts.pluginName] = { type: 'vendor', ...paths };
  } else {
    harness.plugins[opts.pluginName] = {
      type: 'reference',
      source: opts.url,
      ref: opts.ref ?? 'main',
      ...paths,
    };
    addToGitignore(opts.packagePath, `plugins/${opts.pluginName}/`);
  }

  writeHarness(opts.packagePath, harness);
}

export function runPluginsUpdate(opts: {
  pluginName?: string;
  packagePath: string;
}): { updated: string[] } {
  const harness = requireHarness(opts.packagePath);
  const entries = Object.entries(harness.plugins ?? {});
  const toUpdate = opts.pluginName
    ? entries.filter(([name]) => name === opts.pluginName)
    : entries.filter(([, entry]) => entry.type === 'reference');

  if (opts.pluginName && toUpdate.length === 0) {
    throw new Error(`Plugin '${opts.pluginName}' not found in harness.json`);
  }

  const updated: string[] = [];
  for (const [name, entry] of toUpdate) {
    if (entry.type !== 'reference') {
      throw new Error(`Plugin '${name}' is vendored — nothing to update`);
    }
    cloneAt(entry.source, entry.ref, packagePluginDir(opts.packagePath, name));
    updated.push(name);
  }
  return { updated };
}

export function runPluginsList(opts: {
  packagePath: string;
}): {
  plugins: Array<{
    name: string;
    type: string;
    source?: string;
    ref?: string;
    onDisk: boolean;
    agents: string[];
  }>;
} {
  const harness = requireHarness(opts.packagePath);
  const plugins = Object.entries(harness.plugins ?? {}).map(([name, entry]) => ({
    name,
    type: entry.type,
    source: entry.type === 'reference' ? entry.source : undefined,
    ref: entry.type === 'reference' ? entry.ref : undefined,
    onDisk: fs.existsSync(packagePluginDir(opts.packagePath, name)),
    agents: coverage(opts.packagePath, name, entry.paths),
  }));

  const dir = packagePluginsDir(opts.packagePath);
  if (fs.existsSync(dir)) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory() || plugins.some((p) => p.name === entry.name)) continue;
      plugins.push({
        name: entry.name,
        type: 'vendor',
        source: undefined,
        ref: undefined,
        onDisk: true,
        agents: coverage(opts.packagePath, entry.name),
      });
    }
  }

  return { plugins: plugins.sort((a, b) => a.name.localeCompare(b.name)) };
}
