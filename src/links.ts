import fs from 'node:fs';
import path from 'node:path';
import {
  globalIndexFile, projectCanonicalIndex, globalConfigFile,
  claudeGlobalFile, codexGlobalFile, piGlobalFile, geminiGlobalFile, opencodeGlobalFile, copilotGlobalFile,
  projectIndexFile, projectClaudeFile, projectGeminiFile, projectCopilotFile,
} from './paths.js';
import type { GlobalConfig } from './types.js';

export type Layer = 'global' | 'project';

export const SUPPORTED_AGENTS = ['claude', 'codex', 'pi', 'gemini', 'opencode', 'copilot'] as const;

const GLOBAL_TARGETS: Record<string, (base: string) => string> = {
  claude: claudeGlobalFile,
  codex: codexGlobalFile,
  pi: piGlobalFile,
  gemini: geminiGlobalFile,
  opencode: opencodeGlobalFile,
  copilot: copilotGlobalFile,
};

const PROJECT_TARGETS: Record<string, (base: string) => string> = {
  claude: projectClaudeFile,
  codex: projectIndexFile,
  pi: projectIndexFile,
  opencode: projectIndexFile,
  gemini: projectGeminiFile,
  copilot: projectCopilotFile,
};

function targetFor(layer: Layer, agent: string, base: string): string | undefined {
  const map = layer === 'global' ? GLOBAL_TARGETS : PROJECT_TARGETS;
  const fn = map[agent];
  return fn ? fn(base) : undefined;
}

function sourceFor(layer: Layer, base: string): string {
  return layer === 'global' ? globalIndexFile(base) : projectCanonicalIndex(base);
}

export function linkAgent(layer: Layer, agent: string, base: string): void {
  const target = targetFor(layer, agent, base);
  if (!target) return;
  const source = sourceFor(layer, base);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const rel = path.relative(path.dirname(target), source);
  if (fs.lstatSync(target, { throwIfNoEntry: false })) fs.rmSync(target, { force: true });
  try {
    fs.symlinkSync(rel, target);
  } catch (err) {
    throw new Error(
      `Cannot create symlink ${target} -> ${source}: ${err instanceof Error ? err.message : String(err)}. ` +
      `On Windows, enable Developer Mode or run in an elevated shell.`,
    );
  }
}

export function unlinkAgent(layer: Layer, agent: string, base: string): void {
  const target = targetFor(layer, agent, base);
  if (!target) return;
  const stat = fs.lstatSync(target, { throwIfNoEntry: false });
  if (stat && stat.isSymbolicLink()) fs.rmSync(target, { force: true });
}

export function isLinked(layer: Layer, agent: string, base: string): boolean {
  const target = targetFor(layer, agent, base);
  if (!target) return false;
  const stat = fs.lstatSync(target, { throwIfNoEntry: false });
  if (!stat || !stat.isSymbolicLink()) return false;
  try {
    return fs.realpathSync(target) === fs.realpathSync(sourceFor(layer, base));
  } catch {
    return false;
  }
}

export function readGlobalConfig(home: string): GlobalConfig {
  const p = globalConfigFile(home);
  if (!fs.existsSync(p)) return { agents: [] };
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch (err) {
    throw new Error(`Malformed config.json: ${err instanceof Error ? err.message : String(err)}`);
  }
  // Migration: tools → agents
  if (Array.isArray(raw['tools']) && !raw['agents']) {
    raw['agents'] = raw['tools'];
    delete raw['tools'];
    fs.writeFileSync(p, JSON.stringify(raw, null, 2) + '\n');
  }
  return {
    agents: Array.isArray(raw['agents']) ? (raw['agents'] as string[]) : [],
    packagePath: typeof raw['packagePath'] === 'string' ? raw['packagePath'] : undefined,
  };
}

export function readConfiguredAgents(home: string): string[] {
  try {
    return readGlobalConfig(home).agents;
  } catch {
    return [];
  }
}

export const SKILL_TARGETS: Record<string, (home: string, skillName: string) => string> = {
  claude: (home, name) => path.join(home, '.claude', 'skills', name),
};

export function linkSkill(agentName: string, skillName: string, home: string, sehSkillPath: string): void {
  const targetFn = SKILL_TARGETS[agentName];
  if (!targetFn) return;
  const target = targetFn(home, skillName);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (fs.lstatSync(target, { throwIfNoEntry: false })) fs.rmSync(target, { force: true });
  const rel = path.relative(path.dirname(target), sehSkillPath);
  try {
    fs.symlinkSync(rel, target);
  } catch (err) {
    throw new Error(`Cannot create symlink ${target}: ${err instanceof Error ? err.message : String(err)}`);
  }
}
