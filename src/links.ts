import fs from 'node:fs';
import path from 'node:path';
import {
  globalIndexFile, projectCanonicalIndex, globalConfigFile,
  claudeGlobalFile, codexGlobalFile, piGlobalFile, geminiGlobalFile, opencodeGlobalFile, copilotGlobalFile,
  projectIndexFile, projectClaudeFile, projectGeminiFile, projectCopilotFile,
} from './paths.js';

export type Layer = 'global' | 'project';

export const SUPPORTED_TOOLS = ['claude', 'codex', 'pi', 'gemini', 'opencode', 'copilot'] as const;

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

function targetFor(layer: Layer, tool: string, base: string): string | undefined {
  const map = layer === 'global' ? GLOBAL_TARGETS : PROJECT_TARGETS;
  const fn = map[tool];
  return fn ? fn(base) : undefined;
}

function sourceFor(layer: Layer, base: string): string {
  return layer === 'global' ? globalIndexFile(base) : projectCanonicalIndex(base);
}

export function linkTool(layer: Layer, tool: string, base: string): void {
  const target = targetFor(layer, tool, base);
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

export function unlinkTool(layer: Layer, tool: string, base: string): void {
  const target = targetFor(layer, tool, base);
  if (!target) return;
  const stat = fs.lstatSync(target, { throwIfNoEntry: false });
  if (stat && stat.isSymbolicLink()) fs.rmSync(target, { force: true });
}

export function isLinked(layer: Layer, tool: string, base: string): boolean {
  const target = targetFor(layer, tool, base);
  if (!target) return false;
  const stat = fs.lstatSync(target, { throwIfNoEntry: false });
  if (!stat || !stat.isSymbolicLink()) return false;
  try {
    return fs.realpathSync(target) === fs.realpathSync(sourceFor(layer, base));
  } catch {
    return false;
  }
}

export function readConfiguredTools(home: string): string[] {
  const p = globalConfigFile(home);
  if (!fs.existsSync(p)) return [];
  try {
    const cfg = JSON.parse(fs.readFileSync(p, 'utf8'));
    return Array.isArray(cfg.tools) ? cfg.tools : [];
  } catch {
    return [];
  }
}
