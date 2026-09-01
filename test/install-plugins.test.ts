import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { runPackageInstall } from '../src/commands/install.js';
import { runPackageInit, runPackageUse } from '../src/commands/package.js';
import { packagePluginDir, packageSkillDir, sehPluginDir, packageHarnessJson } from '../src/paths.js';
import { PLUGIN_ADAPTERS } from '../src/plugin-adapters.js';

const targetDir = (agent: string, home: string) =>
  PLUGIN_ADAPTERS.find((a) => a.agent === agent)!.targetDir(home);

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sehpi-'));
}

/** A package holding one vendored plugin made of `files`, plus a fresh HOME. */
function pkgWithPlugin(name: string, files: Record<string, string>): { pkg: string; home: string } {
  const pkg = path.join(tmpDir(), 'my-harness');
  runPackageInit({ packagePath: pkg });
  for (const [rel, content] of Object.entries(files)) {
    const f = path.join(packagePluginDir(pkg, name), rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, content);
  }
  patchHarness(pkg, (h) => { h.plugins = { [name]: { type: 'vendor' } }; });
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'sehhome-'));
  runPackageUse({ packagePath: pkg, home });
  return { pkg, home };
}

function patchHarness(pkg: string, mutate: (h: Record<string, any>) => void): void {
  const hj = packageHarnessJson(pkg);
  const h = JSON.parse(fs.readFileSync(hj, 'utf8'));
  mutate(h);
  fs.writeFileSync(hj, JSON.stringify(h, null, 2) + '\n');
}

const CLAUDE_PLUGIN = { '.claude-plugin/plugin.json': '{"name":"demo","version":"1.0.0"}' };

describe('runPackageInstall --plugins', () => {
  it('symlinks ~/.seh/plugins/<name>/ to the package plugin', () => {
    const { pkg, home } = pkgWithPlugin('demo', CLAUDE_PLUGIN);
    runPackageInstall({ plugins: true, agents: [], home });
    const intermediate = sehPluginDir(home, 'demo');
    expect(fs.lstatSync(intermediate).isSymbolicLink()).toBe(true);
    expect(fs.realpathSync(intermediate)).toBe(fs.realpathSync(packagePluginDir(pkg, 'demo')));
  });

  it('links the plugin into an agent that it ships an adapter for', () => {
    const { home } = pkgWithPlugin('demo', CLAUDE_PLUGIN);
    const { installedPlugins } = runPackageInstall({ plugins: true, agents: ['claude'], home });
    const link = path.join(targetDir('claude', home), 'demo');
    expect(fs.realpathSync(link)).toBe(fs.realpathSync(sehPluginDir(home, 'demo')));
    expect(installedPlugins).toEqual([{ name: 'demo', linked: ['claude'], skipped: [] }]);
  });

  it('does not link into an agent the plugin has no adapter for', () => {
    const { home } = pkgWithPlugin('demo', CLAUDE_PLUGIN);
    const { installedPlugins } = runPackageInstall({ plugins: true, agents: ['claude', 'gemini'], home });
    expect(fs.existsSync(path.join(targetDir('gemini', home), 'demo'))).toBe(false);
    expect(installedPlugins[0]).toEqual({ name: 'demo', linked: ['claude'], skipped: ['gemini'] });
  });

  it('reports agents seh cannot wire plugins into as skipped', () => {
    const { home } = pkgWithPlugin('demo', CLAUDE_PLUGIN);
    const { installedPlugins } = runPackageInstall({ plugins: true, agents: ['claude', 'codex'], home });
    expect(installedPlugins[0]?.skipped).toEqual(['codex']);
  });

  it('links a multi-agent plugin into every selected agent it supports', () => {
    const { home } = pkgWithPlugin('demo', {
      ...CLAUDE_PLUGIN,
      'gemini-extension.json': '{"name":"demo"}',
      'index.js': 'export default {}\n',
    });
    runPackageInstall({ plugins: true, agents: ['claude', 'gemini', 'pi'], home });
    for (const agent of ['claude', 'gemini', 'pi']) {
      expect(fs.realpathSync(path.join(targetDir(agent, home), 'demo')))
        .toBe(fs.realpathSync(sehPluginDir(home, 'demo')));
    }
  });

  it('keeps the file extension when the adapter is a plugin file', () => {
    const { home } = pkgWithPlugin('demo', {
      'package.json': JSON.stringify({ name: 'demo', main: './.opencode/plugins/demo.mjs' }),
      '.opencode/plugins/demo.mjs': 'export default {}\n',
    });
    runPackageInstall({ plugins: true, agents: ['opencode'], home });
    const link = path.join(targetDir('opencode', home), 'demo.mjs');
    expect(fs.realpathSync(link))
      .toBe(fs.realpathSync(path.join(sehPluginDir(home, 'demo'), '.opencode', 'plugins', 'demo.mjs')));
  });

  it('honours a harness.json path override', () => {
    const { home, pkg } = pkgWithPlugin('demo', { 'custom/index.js': 'export default {}\n' });
    patchHarness(pkg, (h) => { h.plugins.demo.paths = { pi: 'custom' }; });
    runPackageInstall({ plugins: true, agents: ['pi'], home });
    expect(fs.realpathSync(path.join(targetDir('pi', home), 'demo')))
      .toBe(fs.realpathSync(path.join(sehPluginDir(home, 'demo'), 'custom')));
  });

  it('wires a newly selected agent on a second run', () => {
    const { home } = pkgWithPlugin('demo', { ...CLAUDE_PLUGIN, 'gemini-extension.json': '{}' });
    runPackageInstall({ plugins: true, agents: ['claude'], home });
    runPackageInstall({ plugins: true, agents: ['gemini'], home });
    expect(fs.existsSync(path.join(targetDir('gemini', home), 'demo'))).toBe(true);
  });

  it('fetches a referenced plugin before linking it', () => {
    const repo = tmpDir();
    execSync('git init -b main', { cwd: repo, stdio: 'pipe' });
    execSync('git config user.email "t@t.com" && git config user.name "T"', { cwd: repo, stdio: 'pipe' });
    fs.mkdirSync(path.join(repo, '.claude-plugin'), { recursive: true });
    fs.writeFileSync(path.join(repo, '.claude-plugin', 'plugin.json'), '{"name":"fetched"}');
    execSync('git add -A && git commit -m init', { cwd: repo, stdio: 'pipe' });

    const pkg = path.join(tmpDir(), 'my-harness');
    runPackageInit({ packagePath: pkg });
    patchHarness(pkg, (h) => {
      h.plugins = { fetched: { type: 'reference', source: `file://${repo}`, ref: 'main' } };
    });
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'sehhome-'));
    runPackageUse({ packagePath: pkg, home });

    const { installedPlugins } = runPackageInstall({ plugins: true, agents: ['claude'], home });
    expect(installedPlugins[0]?.linked).toEqual(['claude']);
    expect(fs.existsSync(path.join(targetDir('claude', home), 'fetched'))).toBe(true);
  });

  it('refuses a package where a plugin and a skill share a name', () => {
    const { pkg, home } = pkgWithPlugin('demo', CLAUDE_PLUGIN);
    fs.mkdirSync(packageSkillDir(pkg, 'demo'), { recursive: true });
    patchHarness(pkg, (h) => { h.skills = { demo: { type: 'vendor' } }; });
    expect(() => runPackageInstall({ plugins: true, agents: ['claude'], home })).toThrow('demo');
  });

  it('refuses to replace a real directory at an agent target', () => {
    const { home } = pkgWithPlugin('demo', CLAUDE_PLUGIN);
    const native = path.join(targetDir('claude', home), 'demo');
    fs.mkdirSync(native, { recursive: true });
    fs.writeFileSync(path.join(native, 'keep.md'), 'installed by hand\n');
    expect(() => runPackageInstall({ plugins: true, agents: ['claude'], home })).toThrow('--force');
    expect(fs.existsSync(path.join(native, 'keep.md'))).toBe(true);
  });

  it('replaces a real directory at an agent target with --force', () => {
    const { home } = pkgWithPlugin('demo', CLAUDE_PLUGIN);
    const native = path.join(targetDir('claude', home), 'demo');
    fs.mkdirSync(native, { recursive: true });
    fs.writeFileSync(path.join(native, 'keep.md'), 'installed by hand\n');
    runPackageInstall({ plugins: true, agents: ['claude'], force: true, home });
    expect(fs.lstatSync(native).isSymbolicLink()).toBe(true);
  });

  it('does not link a module adapter whose npm dependencies are not installed', () => {
    const { home } = pkgWithPlugin('pi-web-access', {
      'package.json': JSON.stringify({ name: 'pi-web-access', pi: { extensions: ['./index.ts'] }, dependencies: { linkedom: '^0.16.0' } }),
      'index.ts': 'import "linkedom";\n',
    });
    const { installedPlugins } = runPackageInstall({ plugins: true, agents: ['pi'], home });
    expect(fs.existsSync(path.join(targetDir('pi', home), 'pi-web-access'))).toBe(false);
    expect(installedPlugins[0]).toEqual({
      name: 'pi-web-access',
      linked: [],
      skipped: ['pi'],
      hostInstall: 'pi install npm:pi-web-access',
    });
  });

  it('links nothing for a plugin that needs its host installer', () => {
    const { home } = pkgWithPlugin('mixed', {
      ...CLAUDE_PLUGIN,
      'package.json': JSON.stringify({ name: 'mixed', pi: { extensions: ['./index.ts'] }, dependencies: { linkedom: '*' } }),
      'index.ts': 'import "linkedom";\n',
    });
    const { installedPlugins } = runPackageInstall({ plugins: true, agents: ['claude', 'pi'], home });
    expect(fs.existsSync(path.join(targetDir('claude', home), 'mixed'))).toBe(false);
    expect(installedPlugins[0]?.linked).toEqual([]);
    expect(installedPlugins[0]?.hostInstall).toContain('pi install npm:mixed');
  });

  it('holds back a workspace monorepo whose packages declare dependencies', () => {
    const { home } = pkgWithPlugin('pi-extensions', {
      'package.json': JSON.stringify({ name: 'pi-extensions', workspaces: ['packages/*'], pi: { extensions: ['./packages/a/src/index.ts'] } }),
      'packages/a/package.json': JSON.stringify({ name: 'a', dependencies: { 'proper-lockfile': '*' } }),
      'packages/a/src/index.ts': 'import "proper-lockfile";\n',
    });
    const { installedPlugins } = runPackageInstall({ plugins: true, agents: ['pi'], home });
    expect(fs.existsSync(path.join(targetDir('pi', home), 'pi-extensions'))).toBe(false);
    expect(installedPlugins[0]?.hostInstall).toContain('pi install');
  });

  it('names the reference source in the host command, since it may not be on npm', () => {
    const pkg = path.join(tmpDir(), 'my-harness');
    runPackageInit({ packagePath: pkg });
    const dir = packagePluginDir(pkg, 'pi-extensions');
    fs.mkdirSync(path.join(dir, 'packages', 'a'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'package.json'), JSON.stringify({ name: 'pi-extensions', pi: { extensions: ['./packages/a/index.ts'] } }));
    fs.writeFileSync(path.join(dir, 'packages', 'a', 'package.json'), JSON.stringify({ dependencies: { x: '*' } }));
    fs.writeFileSync(path.join(dir, 'packages', 'a', 'index.ts'), '');
    patchHarness(pkg, (h) => {
      h.plugins = { 'pi-extensions': { type: 'reference', source: 'https://github.com/narumiruna/pi-extensions', ref: 'main' } };
    });
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'sehhome-'));
    runPackageUse({ packagePath: pkg, home });
    const { installedPlugins } = runPackageInstall({ plugins: true, agents: ['pi'], home });
    expect(installedPlugins[0]?.hostInstall)
      .toBe('pi install https://github.com/narumiruna/pi-extensions');
  });

  it('links the module adapter once its dependencies are installed', () => {
    const { home, pkg } = pkgWithPlugin('pi-web-access', {
      'package.json': JSON.stringify({ name: 'pi-web-access', pi: { extensions: ['./index.ts'] }, dependencies: { linkedom: '*' } }),
      'index.ts': 'import "linkedom";\n',
    });
    fs.mkdirSync(path.join(packagePluginDir(pkg, 'pi-web-access'), 'node_modules', 'linkedom'), { recursive: true });
    const { installedPlugins } = runPackageInstall({ plugins: true, agents: ['pi'], home });
    expect(fs.existsSync(path.join(targetDir('pi', home), 'pi-web-access'))).toBe(true);
    expect(installedPlugins[0]?.hostInstall).toBeUndefined();
  });

  it('omits hostInstall for a dependency-free plugin', () => {
    const { home } = pkgWithPlugin('demo', CLAUDE_PLUGIN);
    const { installedPlugins } = runPackageInstall({ plugins: true, agents: ['claude'], home });
    expect(installedPlugins[0]?.hostInstall).toBeUndefined();
  });

  it('installs nothing when the package has no plugins', () => {
    const pkg = path.join(tmpDir(), 'my-harness');
    runPackageInit({ packagePath: pkg });
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'sehhome-'));
    runPackageUse({ packagePath: pkg, home });
    expect(runPackageInstall({ plugins: true, agents: ['claude'], home }).installedPlugins).toEqual([]);
  });
});

describe('runPackageInstall --all', () => {
  it('installs plugins alongside harness and skills', () => {
    const { pkg, home } = pkgWithPlugin('demo', CLAUDE_PLUGIN);
    fs.writeFileSync(path.join(pkg, 'global', 'AGENTS.md'), '# Rules\n');
    const result = runPackageInstall({ all: true, agents: ['claude'], home });
    expect(result.installedHarness).toBe(true);
    expect(result.installedPlugins.map((p) => p.name)).toEqual(['demo']);
  });
});
