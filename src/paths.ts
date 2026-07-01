import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const home = () => os.homedir();

export const globalDir = (h: string = home()) => path.join(h, '.se-harness');
export const globalPrefsFile = (h: string = home()) => path.join(globalDir(h), 'preferences.md');
export const globalConfigFile = (h: string = home()) => path.join(globalDir(h), 'config.json');
export const projectHarnessDir = (root: string) => path.join(root, '.harness');
export const lockFile = (root: string) => path.join(root, 'harness.lock');

export function assetsDir(): string {
  // dist/paths.js and src/paths.ts both sit one level below package root.
  const here = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(here, '..', 'assets');
}
