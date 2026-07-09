import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { PackageResolver, readResolver } from '../src/package-resolver.js';
import { packageTemplatesStackDir, packageGlobalAgentsMd, packageProjectsDir, globalConfigFile } from '../src/paths.js';
import { runPackageInit } from '../src/commands/package.js';
import { runSkillsAdd } from '../src/commands/skills.js';

function tmpPkg(): string {
  const p = fs.mkdtempSync(path.join(os.tmpdir(), 'sehpkg-'));
  fs.mkdirSync(packageTemplatesStackDir(p), { recursive: true });
  fs.mkdirSync(packageGlobalAgentsMd(p).replace('/AGENTS.md', ''), { recursive: true });
  fs.mkdirSync(packageProjectsDir(p), { recursive: true });
  return p;
}

function tmpGitRepo(fileName: string, content: string): string {
  const repo = fs.mkdtempSync(path.join(os.tmpdir(), 'sehpr-'));
  execSync('git init -b main', { cwd: repo, stdio: 'pipe' });
  execSync('git config user.email "t@t.com"', { cwd: repo, stdio: 'pipe' });
  execSync('git config user.name "T"', { cwd: repo, stdio: 'pipe' });
  fs.writeFileSync(path.join(repo, fileName), content);
  execSync('git add .', { cwd: repo, stdio: 'pipe' });
  execSync('git commit -m "init"', { cwd: repo, stdio: 'pipe' });
  return repo;
}

describe('PackageResolver', () => {
  it('active is false when no package path', () => {
    const r = new PackageResolver(null);
    expect(r.active).toBe(false);
  });

  it('active is true when package path provided', () => {
    const p = tmpPkg();
    expect(new PackageResolver(p).active).toBe(true);
  });

  it('stackModule falls back to bundled when file absent from package', () => {
    const r = new PackageResolver(tmpPkg());
    const content = r.stackModule('typescript');
    expect(content.length).toBeGreaterThan(0);
    expect(content).toContain('TypeScript');
  });

  it('stackModule returns package file when present', () => {
    const p = tmpPkg();
    fs.writeFileSync(path.join(packageTemplatesStackDir(p), 'typescript.md'), '# Custom TS\n');
    const content = new PackageResolver(p).stackModule('typescript');
    expect(content).toBe('# Custom TS\n');
  });

  it('globalAgentsMd returns null when no package', () => {
    expect(new PackageResolver(null).globalAgentsMd()).toBeNull();
  });

  it('globalAgentsMd returns null when file absent from package', () => {
    expect(new PackageResolver(tmpPkg()).globalAgentsMd()).toBeNull();
  });

  it('globalAgentsMd returns package file when present', () => {
    const p = tmpPkg();
    fs.writeFileSync(packageGlobalAgentsMd(p), '# My Rules\n');
    expect(new PackageResolver(p).globalAgentsMd()).toBe('# My Rules\n');
  });

  it('projectOverlayFiles returns empty when no package', () => {
    expect(new PackageResolver(null).projectOverlayFiles('myrepo')).toEqual([]);
  });

  it('projectOverlayFiles returns empty when no overlay dir', () => {
    expect(new PackageResolver(tmpPkg()).projectOverlayFiles('myrepo')).toEqual([]);
  });

  it('projectOverlayFiles returns files from projects/<name>', () => {
    const p = tmpPkg();
    const overlayDir = path.join(packageProjectsDir(p), 'myrepo');
    fs.mkdirSync(overlayDir, { recursive: true });
    fs.writeFileSync(path.join(overlayDir, 'project.md'), '# Overlay\n');
    const files = new PackageResolver(p).projectOverlayFiles('myrepo');
    expect(files).toHaveLength(1);
    expect(files[0].relPath).toBe('project.md');
    expect(files[0].content).toBe('# Overlay\n');
  });

  it('projectTemplateNames returns empty when no package', () => {
    expect(new PackageResolver(null).projectTemplateNames()).toEqual([]);
  });

  it('projectTemplateNames lists subdirectories of templates/project/', () => {
    const p = tmpPkg();
    fs.mkdirSync(path.join(p, 'templates', 'project', 'nextjs'), { recursive: true });
    fs.mkdirSync(path.join(p, 'templates', 'project', 'fastapi'), { recursive: true });
    expect(new PackageResolver(p).projectTemplateNames()).toEqual(['fastapi', 'nextjs']);
  });

  it('projectTemplateFiles returns files from templates/project/<name>', () => {
    const p = tmpPkg();
    const tplDir = path.join(p, 'templates', 'project', 'nextjs');
    fs.mkdirSync(tplDir, { recursive: true });
    fs.writeFileSync(path.join(tplDir, 'project.md'), '# NextJS Template\n');
    const files = new PackageResolver(p).projectTemplateFiles('nextjs');
    expect(files).toHaveLength(1);
    expect(files[0].relPath).toBe('project.md');
    expect(files[0].content).toBe('# NextJS Template\n');
  });

  it('skills() returns empty object when no active package', () => {
    const r = new PackageResolver(null);
    expect(r.skills()).toEqual({});
  });

  it('skills() returns empty object when harness.json has no skills', () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'sehbase-'));
    const pkg = path.join(base, 'my-harness');
    runPackageInit({ packagePath: pkg });
    const r = new PackageResolver(pkg);
    expect(r.skills()).toEqual({});
  });

  it('skills() returns skills map from harness.json', () => {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'sehbase-'));
    const pkg = path.join(base, 'my-harness');
    runPackageInit({ packagePath: pkg });
    const repo = tmpGitRepo('s.md', '# S\n');
    runSkillsAdd({
      url: `file://${repo}`,
      skillName: 'caveman',
      type: 'vendor',
      packagePath: pkg,
      invoke: { mode: 'always', label: 'every response' },
    });
    const r = new PackageResolver(pkg);
    const skills = r.skills();
    expect(skills['caveman']?.type).toBe('vendor');
    expect(skills['caveman']?.invoke).toEqual({ mode: 'always', label: 'every response' });
  });
});

describe('readResolver', () => {
  it('returns inactive resolver when no config', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'sehh-'));
    expect(readResolver(home).active).toBe(false);
  });

  it('returns inactive resolver when config has no packagePath', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'sehh-'));
    fs.mkdirSync(path.join(home, '.seh'), { recursive: true });
    fs.writeFileSync(globalConfigFile(home), JSON.stringify({ agents: ['claude'] }));
    expect(readResolver(home).active).toBe(false);
  });

  it('returns active resolver when config has packagePath', () => {
    const home = fs.mkdtempSync(path.join(os.tmpdir(), 'sehh-'));
    const pkg = tmpPkg();
    fs.mkdirSync(path.join(home, '.seh'), { recursive: true });
    fs.writeFileSync(globalConfigFile(home), JSON.stringify({ agents: [], packagePath: pkg }));
    const r = readResolver(home);
    expect(r.active).toBe(true);
    expect(r.path).toBe(pkg);
  });
});
