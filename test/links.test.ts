import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { linkTool, unlinkTool, isLinked, SUPPORTED_TOOLS, readConfiguredTools } from '../src/links.js';
import { globalDir, globalIndexFile, projectSehDir, projectCanonicalIndex,
  codexGlobalFile, projectCopilotFile, projectIndexFile } from '../src/paths.js';

function tmpHome() {
  const h = fs.mkdtempSync(path.join(os.tmpdir(), 'sehlk-'));
  fs.mkdirSync(globalDir(h), { recursive: true });
  fs.writeFileSync(globalIndexFile(h), '# global');
  return h;
}
function tmpRepo() {
  const r = fs.mkdtempSync(path.join(os.tmpdir(), 'sehrp-'));
  fs.mkdirSync(projectSehDir(r), { recursive: true });
  fs.writeFileSync(projectCanonicalIndex(r), '# project');
  return r;
}

describe('links (layer-aware)', () => {
  it('lists all supported tools', () => {
    expect([...SUPPORTED_TOOLS]).toEqual(['claude','codex','pi','gemini','opencode','copilot']);
  });
  it('creates and detects a global symlink', () => {
    const h = tmpHome();
    linkTool('global', 'codex', h);
    expect(fs.lstatSync(codexGlobalFile(h)).isSymbolicLink()).toBe(true);
    expect(isLinked('global', 'codex', h)).toBe(true);
    unlinkTool('global', 'codex', h);
    expect(isLinked('global', 'codex', h)).toBe(false);
  });
  it('treats copilot global as a no-op', () => {
    const h = tmpHome();
    linkTool('global', 'copilot', h);
    expect(isLinked('global', 'copilot', h)).toBe(false);
  });
  it('creates nested project symlink for copilot', () => {
    const r = tmpRepo();
    linkTool('project', 'copilot', r);
    const target = projectCopilotFile(r);
    expect(fs.lstatSync(target).isSymbolicLink()).toBe(true);
    expect(fs.realpathSync(target)).toBe(fs.realpathSync(projectCanonicalIndex(r)));
  });
  it('replaces a pre-existing real project file with a symlink', () => {
    const r = tmpRepo();
    fs.writeFileSync(projectIndexFile(r), 'stale real file');
    linkTool('project', 'codex', r);
    expect(fs.lstatSync(projectIndexFile(r)).isSymbolicLink()).toBe(true);
  });
  it('reads configured tools from global config', () => {
    const h = tmpHome();
    fs.writeFileSync(path.join(globalDir(h), 'config.json'), JSON.stringify({ tools: ['codex','gemini'] }));
    expect(readConfiguredTools(h)).toEqual(['codex','gemini']);
    const h2 = tmpHome();
    expect(readConfiguredTools(h2)).toEqual([]);
  });
});
