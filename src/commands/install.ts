import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { readGlobalConfig, linkSkill } from '../links.js';
import { PackageResolver } from '../package-resolver.js';
import { runInitGlobal } from './initGlobal.js';
import {
  packageSkillsDir, packageSkillDir,
  packageGlobalConfigJson, sehSkillsDir, sehSkillDir,
  packagePluginsDir, packagePluginDir, sehPluginsDir, sehPluginDir,
} from '../paths.js';
import { cloneAt, readHarness } from '../units.js';
import { detectAdapters, linkNameFor, pendingDependencies } from '../plugin-adapters.js';
import { vendoredInstallCommand } from './plugins.js';
import type { PluginPaths } from '../types.js';

export type PluginInstall = {
  name: string;
  linked: string[];
  skipped: string[];
  /** Set when the plugin's npm dependencies must be installed by the host itself. */
  hostInstall?: string;
};

function symlink(target: string, source: string, force?: boolean): void {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const existing = fs.lstatSync(target, { throwIfNoEntry: false });
  if (existing && !existing.isSymbolicLink() && !force) {
    throw new Error(
      `Refusing to replace ${target}: it is not a seh symlink. ` +
      `Move it aside, or re-run with --force to overwrite it.`,
    );
  }
  if (existing) fs.rmSync(target, { recursive: true, force: true });
  try {
    fs.symlinkSync(path.relative(path.dirname(target), source), target);
  } catch (err) {
    throw new Error(`Cannot create symlink ${target}: ${err instanceof Error ? err.message : String(err)}`);
  }
}

/**
 * Fan one plugin out: package -> ~/.seh/plugins/<name> -> every selected agent
 * that the plugin ships an adapter for.
 */
function installPlugin(opts: {
  name: string;
  packagePath: string;
  home: string;
  agents: string[];
  paths?: PluginPaths;
  /** The reference URL this plugin came from, when it has one. */
  spec?: string;
  force?: boolean;
}): PluginInstall {
  const source = packagePluginDir(opts.packagePath, opts.name);
  const intermediate = sehPluginDir(opts.home, opts.name);

  fs.mkdirSync(sehPluginsDir(opts.home), { recursive: true });
  if (!fs.lstatSync(intermediate, { throwIfNoEntry: false }) || opts.force) {
    symlink(intermediate, source, opts.force);
  }

  const pending = pendingDependencies(source, opts.paths);

  // A plugin whose code needs uninstalled npm dependencies would fail on its
  // first import, breaking every session of that agent. Say how to install them:
  // a referenced plugin goes through its host's installer, a vendored one keeps
  // its source here, so its dependencies are installed in place.
  if (pending && pending.adapters.some((a) => opts.agents.includes(a.agent))) {
    return {
      name: opts.name,
      linked: [],
      skipped: opts.agents,
      hostInstall: opts.spec
        ? pending.adapters
            .filter((a) => opts.agents.includes(a.agent) && a.hostInstall)
            .map((a) => a.hostInstall!(opts.spec!))
            .join('; ')
        : vendoredInstallCommand(source),
    };
  }

  const adapters = detectAdapters(source, opts.paths);
  const linked: string[] = [];
  for (const adapter of adapters) {
    if (!opts.agents.includes(adapter.agent)) continue;
    const linkName = linkNameFor(opts.name, adapter.subpath);
    const target = path.join(adapter.targetDir(opts.home), linkName);
    symlink(target, path.join(intermediate, adapter.subpath), opts.force);
    linked.push(adapter.agent);
  }

  return { name: opts.name, linked, skipped: opts.agents.filter((a) => !linked.includes(a)) };
}

function readPackageAgents(packagePath: string): string[] {
  const p = packageGlobalConfigJson(packagePath);
  if (!fs.existsSync(p)) return [];
  try {
    const raw = JSON.parse(fs.readFileSync(p, 'utf8'));
    if (Array.isArray(raw.tools) && !raw.agents) return raw.tools as string[];
    return Array.isArray(raw.agents) ? (raw.agents as string[]) : [];
  } catch { return []; }
}

export function runPackageInstall(opts: {
  skills?: boolean;
  harness?: boolean;
  plugins?: boolean;
  all?: boolean;
  agents?: string[];
  force?: boolean;
  home?: string;
}): { installedSkills: string[]; installedHarness: boolean; installedPlugins: PluginInstall[] } {
  const home = opts.home ?? os.homedir();
  const cfg = readGlobalConfig(home);
  if (!cfg.packagePath) throw new Error('No active package. Run `seh package use <path>` first.');

  const packagePath = cfg.packagePath;
  const doSkills = opts.skills || opts.all || false;
  const doHarness = opts.harness || opts.all || false;
  const doPlugins = opts.plugins || opts.all || false;
  const installedSkills: string[] = [];
  const installedPlugins: PluginInstall[] = [];
  let installedHarness = false;

  if (doHarness) {
    const resolver = new PackageResolver(packagePath);
    const packageAgents = readPackageAgents(packagePath);
    const skills = readHarness(packagePath)?.skills;
    runInitGlobal({ home, agents: packageAgents, resolver, force: opts.force, skills });
    installedHarness = true;
  }

  if (doSkills) {
    for (const [name, entry] of Object.entries(readHarness(packagePath)?.skills ?? {})) {
      if (entry.type !== 'reference') continue;
      const skillDir = packageSkillDir(packagePath, name);
      if (fs.existsSync(skillDir) && !opts.force) continue;
      cloneAt(entry.source, entry.ref, skillDir);
    }

    const skillsDir = packageSkillsDir(packagePath);
    if (!fs.existsSync(skillsDir)) return { installedSkills, installedHarness, installedPlugins };

    fs.mkdirSync(sehSkillsDir(home), { recursive: true });
    for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const name = entry.name;
      const pkgSkillPath = packageSkillDir(packagePath, name);
      const sehTarget = sehSkillDir(home, name);

      if (fs.lstatSync(sehTarget, { throwIfNoEntry: false }) && !opts.force) continue;
      if (fs.lstatSync(sehTarget, { throwIfNoEntry: false })) {
        fs.rmSync(sehTarget, { force: true });
      }
      const rel = path.relative(path.dirname(sehTarget), pkgSkillPath);
      fs.symlinkSync(rel, sehTarget);

      for (const agent of opts.agents ?? []) {
        linkSkill(agent, name, home, sehTarget);
      }
      installedSkills.push(name);
    }
  }

  if (doPlugins) {
    const harness = readHarness(packagePath);
    const entries = Object.entries(harness?.plugins ?? {});

    // Refuse before fetching anything: Claude loads plugins from its skills directory.
    for (const [name] of entries) {
      if (harness?.skills && name in harness.skills) {
        throw new Error(
          `'${name}' is declared as both a skill and a plugin. Claude loads plugins from its ` +
          `skills directory, so the two would overwrite each other — rename one.`,
        );
      }
    }

    for (const [name, entry] of entries) {
      if (entry.type !== 'reference') continue;
      const dir = packagePluginDir(packagePath, name);
      if (fs.existsSync(dir) && !opts.force) continue;
      cloneAt(entry.source, entry.ref, dir);
    }

    const pluginsDir = packagePluginsDir(packagePath);
    if (fs.existsSync(pluginsDir)) {
      for (const dir of fs.readdirSync(pluginsDir, { withFileTypes: true })) {
        if (!dir.isDirectory()) continue;
        const entry = harness?.plugins?.[dir.name];
        installedPlugins.push(installPlugin({
          name: dir.name,
          packagePath,
          home,
          agents: opts.agents ?? [],
          paths: entry?.paths,
          spec: entry?.type === 'reference' ? entry.source : undefined,
          force: opts.force,
        }));
      }
    }
  }

  return { installedSkills, installedHarness, installedPlugins };
}
