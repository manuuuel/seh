import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { runPluginsAdd, runPluginsUpdate, runPluginsList } from '../src/commands/plugins.js';
import { runPackageInit } from '../src/commands/package.js';
import { packagePluginDir, packageHarnessJson } from '../src/paths.js';

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'sehpl-'));
}

function tmpPkg(): string {
  const p = path.join(tmpDir(), 'my-harness');
  runPackageInit({ packagePath: p });
  return p;
}

/** A git repo shaped like a real plugin: files are `relpath -> content`. */
function tmpPluginRepo(files: Record<string, string>): string {
  const repo = tmpDir();
  execSync('git init -b main', { cwd: repo, stdio: 'pipe' });
  execSync('git config user.email "t@t.com"', { cwd: repo, stdio: 'pipe' });
  execSync('git config user.name "T"', { cwd: repo, stdio: 'pipe' });
  for (const [rel, content] of Object.entries(files)) {
    const f = path.join(repo, rel);
    fs.mkdirSync(path.dirname(f), { recursive: true });
    fs.writeFileSync(f, content);
  }
  execSync('git add -A', { cwd: repo, stdio: 'pipe' });
  execSync('git commit -m init', { cwd: repo, stdio: 'pipe' });
  return repo;
}

const claudePlugin = { '.claude-plugin/plugin.json': '{"name":"demo","version":"1.0.0"}' };
const readHarness = (pkg: string) => JSON.parse(fs.readFileSync(packageHarnessJson(pkg), 'utf8'));

describe('runPluginsAdd --vendor', () => {
  it('clones plugin files into package/plugins/<name>/', () => {
    const pkg = tmpPkg();
    const repo = tmpPluginRepo(claudePlugin);
    runPluginsAdd({ url: `file://${repo}`, pluginName: 'demo', type: 'vendor', packagePath: pkg });
    expect(fs.existsSync(path.join(packagePluginDir(pkg, 'demo'), '.claude-plugin', 'plugin.json'))).toBe(true);
  });

  it('does not leave a .git directory in the plugin dir', () => {
    const pkg = tmpPkg();
    const repo = tmpPluginRepo(claudePlugin);
    runPluginsAdd({ url: `file://${repo}`, pluginName: 'demo', type: 'vendor', packagePath: pkg });
    expect(fs.existsSync(path.join(packagePluginDir(pkg, 'demo'), '.git'))).toBe(false);
  });

  it('writes a vendor entry to harness.json', () => {
    const pkg = tmpPkg();
    const repo = tmpPluginRepo(claudePlugin);
    runPluginsAdd({ url: `file://${repo}`, pluginName: 'demo', type: 'vendor', packagePath: pkg });
    expect(readHarness(pkg).plugins?.demo?.type).toBe('vendor');
  });

  it('keeps a vendored plugin out of .gitignore so it is committed', () => {
    const pkg = tmpPkg();
    const repo = tmpPluginRepo(claudePlugin);
    runPluginsAdd({ url: `file://${repo}`, pluginName: 'demo', type: 'vendor', packagePath: pkg });
    const lines = fs.existsSync(path.join(pkg, '.gitignore'))
      ? fs.readFileSync(path.join(pkg, '.gitignore'), 'utf8').split('\n').map((l) => l.trim())
      : [];
    expect(lines).not.toContain('plugins/demo/');
  });

  it('ignores the node_modules a vendored plugin may need, not the plugin itself', () => {
    const pkg = tmpPkg();
    const repo = tmpPluginRepo(claudePlugin);
    runPluginsAdd({ url: `file://${repo}`, pluginName: 'demo', type: 'vendor', packagePath: pkg });
    expect(fs.readFileSync(path.join(pkg, '.gitignore'), 'utf8')).toContain('plugins/demo/node_modules/');
  });

  it('reports how to install a vendored plugin whose code needs npm dependencies', () => {
    const pkg = tmpPkg();
    const repo = tmpPluginRepo({
      'package.json': JSON.stringify({ name: 'pi-web-access', pi: { extensions: ['./index.ts'] }, dependencies: { linkedom: '*' } }),
      'index.ts': 'import "linkedom";\n',
    });
    const { pendingDeps } = runPluginsAdd({ url: `file://${repo}`, pluginName: 'pi-web-access', type: 'vendor', packagePath: pkg });
    expect(pendingDeps?.deps).toBe(1);
    expect(pendingDeps?.command).toBe(`cd ${packagePluginDir(pkg, 'pi-web-access')} && npm install --omit=dev`);
  });

  it('reports nothing for a vendored plugin with no dependencies', () => {
    const pkg = tmpPkg();
    const repo = tmpPluginRepo(claudePlugin);
    expect(runPluginsAdd({ url: `file://${repo}`, pluginName: 'demo', type: 'vendor', packagePath: pkg }).pendingDeps)
      .toBeUndefined();
  });

  it('still ignores the plugin dir when a vendored plugin is replaced by a reference', () => {
    const pkg = tmpPkg();
    const repo = tmpPluginRepo(claudePlugin);
    runPluginsAdd({ url: `file://${repo}`, pluginName: 'demo', type: 'vendor', packagePath: pkg });
    runPluginsAdd({ url: 'https://github.com/x/demo', pluginName: 'demo', type: 'reference', packagePath: pkg, force: true });
    const lines = fs.readFileSync(path.join(pkg, '.gitignore'), 'utf8').split('\n').map((l) => l.trim());
    expect(lines).toContain('plugins/demo/');
  });

  it('throws when the plugin already exists without --force', () => {
    const pkg = tmpPkg();
    const repo = tmpPluginRepo(claudePlugin);
    runPluginsAdd({ url: `file://${repo}`, pluginName: 'dup', type: 'vendor', packagePath: pkg });
    expect(() => runPluginsAdd({ url: `file://${repo}`, pluginName: 'dup', type: 'vendor', packagePath: pkg }))
      .toThrow('already exists');
  });

  it('overwrites with --force', () => {
    const pkg = tmpPkg();
    const repo = tmpPluginRepo(claudePlugin);
    runPluginsAdd({ url: `file://${repo}`, pluginName: 'dup', type: 'vendor', packagePath: pkg });
    expect(() => runPluginsAdd({ url: `file://${repo}`, pluginName: 'dup', type: 'vendor', packagePath: pkg, force: true }))
      .not.toThrow();
  });

  it('stores adapter path overrides', () => {
    const pkg = tmpPkg();
    const repo = tmpPluginRepo(claudePlugin);
    runPluginsAdd({
      url: `file://${repo}`, pluginName: 'demo', type: 'vendor', packagePath: pkg,
      paths: { pi: 'pi-extension' },
    });
    expect(readHarness(pkg).plugins?.demo?.paths).toEqual({ pi: 'pi-extension' });
  });

  it('omits paths when no override is given', () => {
    const pkg = tmpPkg();
    const repo = tmpPluginRepo(claudePlugin);
    runPluginsAdd({ url: `file://${repo}`, pluginName: 'demo', type: 'vendor', packagePath: pkg });
    expect(readHarness(pkg).plugins?.demo?.paths).toBeUndefined();
  });
});

describe('runPluginsAdd --reference', () => {
  it('records source and ref without fetching files', () => {
    const pkg = tmpPkg();
    runPluginsAdd({
      url: 'https://github.com/DietrichGebert/ponytail',
      pluginName: 'ponytail', type: 'reference', ref: 'main', packagePath: pkg,
    });
    const entry = readHarness(pkg).plugins?.ponytail;
    expect(entry?.type).toBe('reference');
    expect(entry?.source).toBe('https://github.com/DietrichGebert/ponytail');
    expect(entry?.ref).toBe('main');
    expect(fs.existsSync(packagePluginDir(pkg, 'ponytail'))).toBe(false);
  });

  it('defaults ref to main', () => {
    const pkg = tmpPkg();
    runPluginsAdd({ url: 'https://github.com/x/y', pluginName: 'y', type: 'reference', packagePath: pkg });
    expect(readHarness(pkg).plugins?.y?.ref).toBe('main');
  });

  it('appends the plugin dir to package .gitignore', () => {
    const pkg = tmpPkg();
    runPluginsAdd({ url: 'https://github.com/x/y', pluginName: 'y', type: 'reference', packagePath: pkg });
    expect(fs.readFileSync(path.join(pkg, '.gitignore'), 'utf8')).toContain('plugins/y/');
  });

  it('does not duplicate the .gitignore entry on re-run', () => {
    const pkg = tmpPkg();
    runPluginsAdd({ url: 'https://github.com/x/y', pluginName: 'y', type: 'reference', packagePath: pkg });
    runPluginsAdd({ url: 'https://github.com/x/y', pluginName: 'y', type: 'reference', packagePath: pkg, force: true });
    const gi = fs.readFileSync(path.join(pkg, '.gitignore'), 'utf8');
    expect((gi.match(/plugins\/y\//g) ?? []).length).toBe(1);
  });
});

describe('runPluginsUpdate', () => {
  it('re-fetches a referenced plugin from source', () => {
    const pkg = tmpPkg();
    const repo = tmpPluginRepo({ ...claudePlugin, 'VERSION': 'v1\n' });
    runPluginsAdd({ url: `file://${repo}`, pluginName: 'demo', type: 'reference', ref: 'main', packagePath: pkg });
    fs.mkdirSync(packagePluginDir(pkg, 'demo'), { recursive: true });
    fs.writeFileSync(path.join(packagePluginDir(pkg, 'demo'), 'VERSION'), 'stale\n');
    const { updated } = runPluginsUpdate({ pluginName: 'demo', packagePath: pkg });
    expect(updated).toContain('demo');
    expect(fs.readFileSync(path.join(packagePluginDir(pkg, 'demo'), 'VERSION'), 'utf8')).toBe('v1\n');
  });

  it('updates every referenced plugin when no name is given', () => {
    const pkg = tmpPkg();
    const repo = tmpPluginRepo(claudePlugin);
    runPluginsAdd({ url: `file://${repo}`, pluginName: 'a', type: 'reference', packagePath: pkg });
    runPluginsAdd({ url: `file://${repo}`, pluginName: 'b', type: 'reference', packagePath: pkg });
    expect(runPluginsUpdate({ packagePath: pkg }).updated.sort()).toEqual(['a', 'b']);
  });

  it('throws when the plugin is not in harness.json', () => {
    expect(() => runPluginsUpdate({ pluginName: 'ghost', packagePath: tmpPkg() })).toThrow('not found');
  });

  it('throws when the plugin is vendored', () => {
    const pkg = tmpPkg();
    const repo = tmpPluginRepo(claudePlugin);
    runPluginsAdd({ url: `file://${repo}`, pluginName: 'demo', type: 'vendor', packagePath: pkg });
    expect(() => runPluginsUpdate({ pluginName: 'demo', packagePath: pkg })).toThrow('vendored');
  });
});

describe('runPluginsList', () => {
  it('returns an empty list when the package has no plugins', () => {
    expect(runPluginsList({ packagePath: tmpPkg() }).plugins).toEqual([]);
  });

  it('reports type, source and on-disk state', () => {
    const pkg = tmpPkg();
    const repo = tmpPluginRepo(claudePlugin);
    runPluginsAdd({ url: `file://${repo}`, pluginName: 'vendored', type: 'vendor', packagePath: pkg });
    runPluginsAdd({ url: 'https://github.com/x/ref', pluginName: 'referenced', type: 'reference', packagePath: pkg });
    const { plugins } = runPluginsList({ packagePath: pkg });
    expect(plugins.find((p) => p.name === 'vendored')?.onDisk).toBe(true);
    expect(plugins.find((p) => p.name === 'referenced')?.onDisk).toBe(false);
    expect(plugins.find((p) => p.name === 'referenced')?.source).toBe('https://github.com/x/ref');
  });

  it('reports the agents each on-disk plugin supports', () => {
    const pkg = tmpPkg();
    const repo = tmpPluginRepo({ ...claudePlugin, 'gemini-extension.json': '{"name":"demo"}' });
    runPluginsAdd({ url: `file://${repo}`, pluginName: 'demo', type: 'vendor', packagePath: pkg });
    expect(runPluginsList({ packagePath: pkg }).plugins[0]?.agents).toEqual(['claude', 'gemini']);
  });

  it('reports no agents for a plugin that is not on disk', () => {
    const pkg = tmpPkg();
    runPluginsAdd({ url: 'https://github.com/x/ref', pluginName: 'referenced', type: 'reference', packagePath: pkg });
    expect(runPluginsList({ packagePath: pkg }).plugins[0]?.agents).toEqual([]);
  });

  it('applies harness.json path overrides to reported coverage', () => {
    const pkg = tmpPkg();
    const repo = tmpPluginRepo({ 'custom/index.js': 'export default {}\n' });
    runPluginsAdd({
      url: `file://${repo}`, pluginName: 'demo', type: 'vendor', packagePath: pkg,
      paths: { pi: 'custom' },
    });
    expect(runPluginsList({ packagePath: pkg }).plugins[0]?.agents).toEqual(['pi']);
  });

  it('reports no agents instead of crashing on an invalid path override', () => {
    const pkg = tmpPkg();
    const repo = tmpPluginRepo({ 'index.ts': 'export default {}\n' });
    runPluginsAdd({ url: `file://${repo}`, pluginName: 'demo', type: 'vendor', packagePath: pkg });
    const hj = packageHarnessJson(pkg);
    const h = JSON.parse(fs.readFileSync(hj, 'utf8'));
    h.plugins.demo.paths = { pi: '../../etc' };
    fs.writeFileSync(hj, JSON.stringify(h, null, 2) + '\n');
    expect(runPluginsList({ packagePath: pkg }).plugins[0]?.agents).toEqual([]);
  });

  it('includes a plugin present on disk but absent from harness.json', () => {
    const pkg = tmpPkg();
    fs.mkdirSync(packagePluginDir(pkg, 'orphan'), { recursive: true });
    expect(runPluginsList({ packagePath: pkg }).plugins.map((p) => p.name)).toEqual(['orphan']);
  });
});
