import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PLUGIN_ADAPTERS, detectAdapters, linkNameFor, needsHostInstall } from '../src/plugin-adapters.js';

function pluginRoot(files: Record<string, string>): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sehpa-'));
  for (const [rel, content] of Object.entries(files)) {
    const p = path.join(root, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, content);
  }
  return root;
}

const agentsOf = (root: string, overrides?: Record<string, string>) =>
  detectAdapters(root, overrides).map((a) => a.agent);

describe('adapter detection — claude', () => {
  it('detects a plugin manifest at .claude-plugin/plugin.json', () => {
    const root = pluginRoot({ '.claude-plugin/plugin.json': '{"name":"demo","version":"1.0.0"}' });
    const claude = detectAdapters(root).find((a) => a.agent === 'claude');
    expect(claude?.subpath).toBe('.');
  });

  it('is absent when the manifest is missing', () => {
    expect(agentsOf(pluginRoot({ 'README.md': '# x\n' }))).not.toContain('claude');
  });
});

describe('adapter detection — gemini', () => {
  it('detects gemini-extension.json in the root directory', () => {
    const root = pluginRoot({ 'gemini-extension.json': '{"name":"demo","version":"1.0.0"}' });
    expect(detectAdapters(root).find((a) => a.agent === 'gemini')?.subpath).toBe('.');
  });
});

// pi resolves a symlinked extension directory itself (dist/core/extensions/loader.js
// resolveExtensionEntries): package.json "pi.extensions" first, then index.ts/index.js.
// The adapter therefore points at the plugin root, never into it.
describe('adapter detection — pi', () => {
  it('detects a package.json declaring a resolvable pi.extensions entry', () => {
    const root = pluginRoot({
      'package.json': JSON.stringify({ name: 'demo', pi: { extensions: ['./pi-extension/index.js'] } }),
      'pi-extension/index.js': 'export default {}\n',
    });
    expect(detectAdapters(root).find((a) => a.agent === 'pi')?.subpath).toBe('.');
  });

  it('is absent when the declared pi.extensions entry does not exist', () => {
    const root = pluginRoot({ 'package.json': JSON.stringify({ pi: { extensions: ['./missing.js'] } }) });
    expect(agentsOf(root)).not.toContain('pi');
  });

  it('is absent for a bare extensions/ directory, which pi does not resolve', () => {
    expect(agentsOf(pluginRoot({ 'extensions/thing.ts': 'export default {}\n' }))).not.toContain('pi');
  });

  it('detects a root index.ts entrypoint', () => {
    const root = pluginRoot({ 'index.ts': 'export default {}\n' });
    expect(detectAdapters(root).find((a) => a.agent === 'pi')?.subpath).toBe('.');
  });

  it('detects a root index.js entrypoint', () => {
    const root = pluginRoot({ 'index.js': 'export default {}\n' });
    expect(detectAdapters(root).find((a) => a.agent === 'pi')?.subpath).toBe('.');
  });

  it('is absent for a plugin with no pi adapter', () => {
    expect(agentsOf(pluginRoot({ 'gemini-extension.json': '{}' }))).not.toContain('pi');
  });
});

describe('adapter detection — opencode', () => {
  it('resolves package.json main when it points under .opencode/', () => {
    const root = pluginRoot({
      'package.json': JSON.stringify({ name: 'demo', main: './.opencode/plugins/demo.mjs' }),
      '.opencode/plugins/demo.mjs': 'export default {}\n',
    });
    expect(detectAdapters(root).find((a) => a.agent === 'opencode')?.subpath)
      .toBe('.opencode/plugins/demo.mjs');
  });

  it('resolves a single plugin file under .opencode/plugin/', () => {
    const root = pluginRoot({ '.opencode/plugin/demo.ts': 'export default {}\n' });
    expect(detectAdapters(root).find((a) => a.agent === 'opencode')?.subpath)
      .toBe('.opencode/plugin/demo.ts');
  });

  it('is absent when the plugin directory holds no loadable file', () => {
    expect(agentsOf(pluginRoot({ '.opencode/plugin/notes.md': '# x\n' }))).not.toContain('opencode');
  });
});

describe('adapter detection — agents', () => {
  it('detects the cross-agent marketplace manifest', () => {
    const root = pluginRoot({ '.agents/plugins/marketplace.json': '{"name":"demo"}' });
    expect(detectAdapters(root).find((a) => a.agent === 'agents')?.subpath).toBe('.');
  });
});

describe('detectAdapters', () => {
  it('returns no adapters for a directory that is not a plugin', () => {
    expect(detectAdapters(pluginRoot({ 'README.md': '# x\n' }))).toEqual([]);
  });

  it('returns every adapter a multi-agent plugin ships', () => {
    const root = pluginRoot({
      '.claude-plugin/plugin.json': '{"name":"demo"}',
      'gemini-extension.json': '{"name":"demo"}',
      'package.json': JSON.stringify({ name: 'demo', main: './.opencode/plugins/d.mjs', pi: { extensions: ['./pi-extension/index.js'] } }),
      'README.md': '# demo\n',
      '.opencode/plugins/d.mjs': 'export default {}\n',
      'pi-extension/index.js': 'export default {}\n',
    });
    expect(agentsOf(root).sort()).toEqual(['claude', 'gemini', 'opencode', 'pi']);
  });

  it('an override wires an agent whose convention the plugin does not follow', () => {
    const root = pluginRoot({ 'custom/index.js': 'export default {}\n' });
    const found = detectAdapters(root, { pi: 'custom' });
    expect(found).toEqual([expect.objectContaining({ agent: 'pi', subpath: 'custom' })]);
  });

  it('an override replaces a detected subpath', () => {
    const root = pluginRoot({ 'index.ts': '', 'other/index.ts': '' });
    expect(detectAdapters(root, { pi: 'other' }).find((a) => a.agent === 'pi')?.subpath).toBe('other');
  });

  it('rejects an override escaping the plugin directory', () => {
    const root = pluginRoot({ 'index.ts': '' });
    expect(() => detectAdapters(root, { pi: '../../.bashrc' })).toThrow('outside the plugin');
    expect(() => detectAdapters(root, { pi: 'nested/../../escape' })).toThrow('outside the plugin');
  });

  it('rejects an absolute override', () => {
    const root = pluginRoot({ 'index.ts': '' });
    expect(() => detectAdapters(root, { pi: '/etc/passwd' })).toThrow('outside the plugin');
  });

  it('rejects a windows-style override on every platform', () => {
    const root = pluginRoot({ 'index.ts': '' });
    expect(() => detectAdapters(root, { pi: '..\\..\\evil' })).toThrow('outside the plugin');
    expect(() => detectAdapters(root, { pi: 'C:\\Windows' })).toThrow('outside the plugin');
    expect(() => detectAdapters(root, { pi: '\\\\server\\share' })).toThrow('outside the plugin');
  });

  it('ignores a pi.extensions entry pointing outside the plugin', () => {
    const root = pluginRoot({
      'package.json': JSON.stringify({ pi: { extensions: ['../../../etc/passwd'] } }),
    });
    expect(agentsOf(root)).not.toContain('pi');
  });

  it('ignores an opencode main pointing outside the plugin', () => {
    const root = pluginRoot({
      'package.json': JSON.stringify({ main: '../.opencode/plugins/evil.mjs' }),
    });
    expect(agentsOf(root)).not.toContain('opencode');
  });

  it('ignores an override naming an unknown agent', () => {
    const root = pluginRoot({ 'gemini-extension.json': '{}' });
    expect(agentsOf(root, { nonsense: '.' })).toEqual(['gemini']);
  });

  it('every adapter exposes a target directory under the given home', () => {
    for (const adapter of PLUGIN_ADAPTERS) {
      expect(adapter.targetDir('/home/u')).toMatch(/^\/home\/u\//);
    }
  });
});

// The entrypoints are the files an agent actually loads; only their governing
// package.json files matter. Anything else in the repo is not that agent's
// business — ponytail bundles an MCP server with its own dependencies which pi
// never loads.
describe('needsHostInstall', () => {
  it('is null when the agent loads no module at all', () => {
    const root = pluginRoot({ 'package.json': JSON.stringify({ dependencies: { linkedom: '*' } }) });
    expect(needsHostInstall(root, [])).toBeNull();
  });

  it('is null for an entrypoint whose package declares no dependencies', () => {
    const root = pluginRoot({
      'package.json': JSON.stringify({ name: 'x', dependencies: {} }),
      'index.ts': '',
    });
    expect(needsHostInstall(root, ['index.ts'])).toBeNull();
  });

  it('is null when only peer dependencies are declared, since the host provides those', () => {
    const root = pluginRoot({
      'package.json': JSON.stringify({ name: 'x', peerDependencies: { 'pi-tui': '*' } }),
      'index.ts': '',
    });
    expect(needsHostInstall(root, ['index.ts'])).toBeNull();
  });

  it('reports the package name and dependency count for uninstalled dependencies', () => {
    const root = pluginRoot({
      'package.json': JSON.stringify({ name: 'pi-web-access', dependencies: { linkedom: '^0.16.0', turndown: '^7.2.0' } }),
      'index.ts': '',
    });
    expect(needsHostInstall(root, ['index.ts'])).toEqual({ spec: 'pi-web-access', deps: 2 });
  });

  it('finds dependencies of the workspace package owning the entrypoint', () => {
    const root = pluginRoot({
      'package.json': JSON.stringify({ name: 'pi-extensions', workspaces: ['packages/*'] }),
      'packages/a/package.json': JSON.stringify({ name: 'a', dependencies: { 'proper-lockfile': '*' } }),
      'packages/a/src/index.ts': '',
    });
    expect(needsHostInstall(root, ['packages/a/src/index.ts'])).toEqual({ spec: 'pi-extensions', deps: 1 });
  });

  it('ignores a sibling component the agent never loads', () => {
    const root = pluginRoot({
      'package.json': JSON.stringify({ name: 'ponytail' }),
      'pi-extension/package.json': JSON.stringify({ name: 'x', private: true }),
      'pi-extension/index.js': '',
      'ponytail-mcp/package.json': JSON.stringify({ dependencies: { '@modelcontextprotocol/sdk': '*', zod: '*' } }),
    });
    expect(needsHostInstall(root, ['pi-extension/index.js'])).toBeNull();
  });

  it('counts the root package when dependencies sit above the entrypoint', () => {
    const root = pluginRoot({
      'package.json': JSON.stringify({ name: 'hoisted', dependencies: { linkedom: '*' } }),
      'src/index.ts': '',
    });
    expect(needsHostInstall(root, ['src/index.ts'])?.deps).toBe(1);
  });

  it('is null once node_modules is present', () => {
    const root = pluginRoot({
      'package.json': JSON.stringify({ name: 'x', dependencies: { linkedom: '*' } }),
      'index.ts': '',
      'node_modules/linkedom/index.js': '',
    });
    expect(needsHostInstall(root, ['index.ts'])).toBeNull();
  });

  it('falls back to the directory name when the package declares no name', () => {
    const root = pluginRoot({
      'package.json': JSON.stringify({ dependencies: { a: '*' } }),
      'index.ts': '',
    });
    expect(needsHostInstall(root, ['index.ts'])?.spec).toBe(path.basename(root));
  });
});

describe('entrypoints', () => {
  const piAdapter = () => PLUGIN_ADAPTERS.find((a) => a.agent === 'pi')!;

  it('are the resolvable pi.extensions entries', () => {
    const root = pluginRoot({
      'package.json': JSON.stringify({ pi: { extensions: ['./a/index.js', './missing.js'] } }),
      'a/index.js': '',
    });
    expect(piAdapter().entrypoints!(root)).toEqual(['a/index.js']);
  });

  it('fall back to the root index when no manifest declares them', () => {
    expect(piAdapter().entrypoints!(pluginRoot({ 'index.ts': '' }))).toEqual(['index.ts']);
  });
});

describe('adapter metadata', () => {
  it('gives a host install command to exactly the agents that load a module', () => {
    const withCommand = PLUGIN_ADAPTERS.filter((a) => a.hostInstall).map((a) => a.agent).sort();
    expect(withCommand).toEqual(['opencode', 'pi']);
  });

  it('builds the command from the given spec', () => {
    const pi = PLUGIN_ADAPTERS.find((a) => a.agent === 'pi')!;
    expect(pi.hostInstall!('npm:pi-web-access')).toBe('pi install npm:pi-web-access');
  });
});

describe('linkNameFor', () => {
  it('uses the plugin name for a directory subpath', () => {
    expect(linkNameFor('ponytail', '.')).toBe('ponytail');
    expect(linkNameFor('ponytail', 'pi-extension')).toBe('ponytail');
  });

  it('keeps the extension when the subpath is a file', () => {
    expect(linkNameFor('ponytail', '.opencode/plugins/ponytail.mjs')).toBe('ponytail.mjs');
    expect(linkNameFor('demo', 'plugin/entry.ts')).toBe('demo.ts');
  });
});
