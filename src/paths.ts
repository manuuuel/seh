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

// Tool global-instruction targets (symlink destinations).
export const claudeGlobalFile = (h: string = home()) => path.join(h, '.claude', 'CLAUDE.md');

export function assetsDir(): string {
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, '..', 'assets');
}
