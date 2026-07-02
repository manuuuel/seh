import fs from 'node:fs';
import path from 'node:path';
import { globalIndexFile, claudeGlobalFile } from './paths.js';

export const TOOL_TARGETS: Record<string, (home?: string) => string> = {
  claude: claudeGlobalFile,
};

function targetFor(tool: string, home?: string): string {
  const fn = TOOL_TARGETS[tool];
  if (!fn) throw new Error(`Unknown tool: ${tool}`);
  return fn(home);
}

export function linkTool(tool: string, home?: string): void {
  const target = targetFor(tool, home);
  const source = globalIndexFile(home);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (fs.lstatSync(target, { throwIfNoEntry: false })) {
    fs.rmSync(target, { force: true });
  }
  fs.symlinkSync(source, target);
}

export function unlinkTool(tool: string, home?: string): void {
  const target = targetFor(tool, home);
  const stat = fs.lstatSync(target, { throwIfNoEntry: false });
  if (stat && stat.isSymbolicLink()) fs.rmSync(target, { force: true });
}

export function isLinked(tool: string, home?: string): boolean {
  const target = targetFor(tool, home);
  const stat = fs.lstatSync(target, { throwIfNoEntry: false });
  if (!stat || !stat.isSymbolicLink()) return false;
  try {
    return fs.realpathSync(target) === fs.realpathSync(globalIndexFile(home));
  } catch {
    return false;
  }
}
