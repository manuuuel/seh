import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { linkAgent, unlinkAgent, isLinked, SUPPORTED_AGENTS, SKILL_TARGETS, readConfiguredAgents, linkSkill } from '../src/links.js';
import { globalDir, globalIndexFile, projectSehDir, projectCanonicalIndex,
  codexGlobalFile, projectCopilotFile, projectIndexFile, sehSkillDir } from '../src/paths.js';

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
  it('lists all supported agents', () => {
    expect([...SUPPORTED_AGENTS]).toEqual(['claude','codex','pi','gemini','opencode','copilot','agents']);
  });
  it('creates and detects a global symlink', () => {
    const h = tmpHome();
    linkAgent('global', 'codex', h);
    expect(fs.lstatSync(codexGlobalFile(h)).isSymbolicLink()).toBe(true);
    expect(isLinked('global', 'codex', h)).toBe(true);
    unlinkAgent('global', 'codex', h);
    expect(isLinked('global', 'codex', h)).toBe(false);
  });
  it('creates a copilot global symlink', () => {
    const h = tmpHome();
    linkAgent('global', 'copilot', h);
    expect(isLinked('global', 'copilot', h)).toBe(true);
  });
  it('creates agents global symlink at ~/.agents/AGENTS.md', () => {
    const h = tmpHome();
    linkAgent('global', 'agents', h);
    expect(isLinked('global', 'agents', h)).toBe(true);
  });
  it('creates agents project symlink at .agents/AGENTS.md', () => {
    const r = tmpRepo();
    linkAgent('project', 'agents', r);
    expect(isLinked('project', 'agents', r)).toBe(true);
  });
  it('creates nested project symlink for copilot', () => {
    const r = tmpRepo();
    linkAgent('project', 'copilot', r);
    const target = projectCopilotFile(r);
    expect(fs.lstatSync(target).isSymbolicLink()).toBe(true);
    expect(fs.realpathSync(target)).toBe(fs.realpathSync(projectCanonicalIndex(r)));
  });
  it('replaces a pre-existing real project file with a symlink', () => {
    const r = tmpRepo();
    fs.writeFileSync(projectIndexFile(r), 'stale real file');
    linkAgent('project', 'codex', r);
    expect(fs.lstatSync(projectIndexFile(r)).isSymbolicLink()).toBe(true);
  });
  it('reads configured agents from global config', () => {
    const h = tmpHome();
    fs.writeFileSync(path.join(globalDir(h), 'config.json'), JSON.stringify({ agents: ['codex','gemini'] }));
    expect(readConfiguredAgents(h)).toEqual(['codex','gemini']);
    const h2 = tmpHome();
    expect(readConfiguredAgents(h2)).toEqual([]);
  });
  it('migrates tools → agents in config.json on read', () => {
    const h = tmpHome();
    fs.writeFileSync(path.join(globalDir(h), 'config.json'), JSON.stringify({ tools: ['claude'] }));
    expect(readConfiguredAgents(h)).toEqual(['claude']);
    const raw = JSON.parse(fs.readFileSync(path.join(globalDir(h), 'config.json'), 'utf8'));
    expect(raw.agents).toEqual(['claude']);
    expect(raw.tools).toBeUndefined();
  });
});

describe('SKILL_TARGETS', () => {
  it('has entries for all supported agents', () => {
    expect(Object.keys(SKILL_TARGETS).sort()).toEqual(['agents', 'claude', 'codex', 'copilot', 'gemini', 'opencode', 'pi']);
  });

  it.each([
    ['claude',    (h: string) => path.join(h, '.claude', 'skills', 'my-skill')],
    ['codex',     (h: string) => path.join(h, '.codex', 'skills', 'my-skill')],
    ['gemini',    (h: string) => path.join(h, '.gemini', 'skills', 'my-skill')],
    ['opencode',  (h: string) => path.join(h, '.config', 'opencode', 'skills', 'my-skill')],
    ['pi',        (h: string) => path.join(h, '.pi', 'agent', 'skills', 'my-skill')],
    ['copilot',   (h: string) => path.join(h, '.copilot', 'skills', 'my-skill')],
    ['agents',    (h: string) => path.join(h, '.agents', 'skills', 'my-skill')],
  ])('%s skill target path', (agent, expectedFn) => {
    const h = tmpHome();
    expect(SKILL_TARGETS[agent]!(h, 'my-skill')).toBe(expectedFn(h));
  });

  it('creates symlink for each skill target', () => {
    for (const agent of Object.keys(SKILL_TARGETS)) {
      const h = tmpHome();
      const skillName = 'test-skill';
      const sehPath = sehSkillDir(h, skillName);
      fs.mkdirSync(sehPath, { recursive: true });
      fs.writeFileSync(path.join(sehPath, 'SKILL.md'), '# test');
      linkSkill(agent, skillName, h, sehPath);
      const target = SKILL_TARGETS[agent]!(h, skillName);
      expect(fs.lstatSync(target).isSymbolicLink()).toBe(true);
      expect(fs.realpathSync(target)).toBe(fs.realpathSync(sehPath));
    }
  });
});
