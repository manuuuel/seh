import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const home = () => os.homedir();

export const globalDir = (h: string = home()) => path.join(h, '.seh');
export const globalIndexFile = (h: string = home()) => path.join(globalDir(h), 'AGENTS.md');
export const globalModulesDir = (h: string = home()) => path.join(globalDir(h), 'global');
export const globalConfigFile = (h: string = home()) => path.join(globalDir(h), 'config.json');

export const projectSehDir = (root: string) => path.join(root, '.seh');
export const projectIndexFile = (root: string) => path.join(root, 'AGENTS.md');
export const projectStackDir = (root: string) => path.join(projectSehDir(root), 'stack');
export const lockFile = (root: string) => path.join(root, 'seh.lock');

export const projectCanonicalIndex = (root: string) => path.join(projectSehDir(root), 'AGENTS.md');
export const projectClaudeFile = (root: string) => path.join(root, 'CLAUDE.md');
export const projectGeminiFile = (root: string) => path.join(root, 'GEMINI.md');
export const projectCopilotFile = (root: string) => path.join(root, '.github', 'copilot-instructions.md');

// Tool global-instruction targets (symlink destinations).
export const claudeGlobalFile = (h: string = home()) => path.join(h, '.claude', 'CLAUDE.md');
export const codexGlobalFile = (h: string = home()) => path.join(h, '.codex', 'AGENTS.md');
export const piGlobalFile = (h: string = home()) => path.join(h, '.pi', 'agent', 'AGENTS.md');
export const geminiGlobalFile = (h: string = home()) => path.join(h, '.gemini', 'GEMINI.md');
export const opencodeGlobalFile = (h: string = home()) => path.join(h, '.config', 'opencode', 'AGENTS.md');
export const copilotGlobalFile = (h: string = home()) => path.join(h, '.copilot', 'copilot-instructions.md');
export const agentsGlobalFile = (h: string = home()) => path.join(h, '.agents', 'AGENTS.md');

export const projectAgentsFile = (root: string) => path.join(root, '.agents', 'AGENTS.md');

export function assetsDir(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, '..', 'assets');
}

export const packageHarnessJson = (p: string) => path.join(p, 'harness.json');
export const packageGlobalDir = (p: string) => path.join(p, 'global');
export const packageGlobalAgentsMd = (p: string) => path.join(p, 'global', 'AGENTS.md');
export const packageGlobalConfigJson = (p: string) => path.join(p, 'global', 'config.json');
export const packageTemplatesStackDir = (p: string) => path.join(p, 'templates', 'stack');
export const packageTemplatesProjectDir = (p: string) => path.join(p, 'templates', 'project');
export const packageProjectsDir = (p: string) => path.join(p, 'projects');

export const sehSkillsDir = (h: string = home()) => path.join(h, '.seh', 'skills');
export const sehSkillDir = (h: string = home(), name: string) => path.join(h, '.seh', 'skills', name);
export const packageSkillsDir = (p: string) => path.join(p, 'skills');
export const packageSkillDir = (p: string, name: string) => path.join(p, 'skills', name);
