import fs from 'node:fs';
import path from 'node:path';
import { SUPPORTED_TECHS } from './catalog.js';

const has = (root: string, f: string) => fs.existsSync(path.join(root, f));

function hasTopLevelC(root: string): boolean {
  try {
    return fs.readdirSync(root).some((f) => f.endsWith('.c'));
  } catch {
    return false;
  }
}

export function detectTechnologies(root: string): string[] {
  const found = new Set<string>();
  if (has(root, 'package.json')) {
    found.add('javascript');
    if (has(root, 'tsconfig.json')) found.add('typescript');
  }
  if (has(root, 'pyproject.toml') || has(root, 'requirements.txt')) found.add('python');
  if (has(root, 'go.mod')) found.add('go');
  if (has(root, 'Cargo.toml')) found.add('rust');
  if (has(root, 'pom.xml') || has(root, 'build.gradle')) found.add('java');
  if (has(root, 'CMakeLists.txt') || has(root, 'Makefile') || hasTopLevelC(root)) found.add('c');
  return SUPPORTED_TECHS.filter((t) => found.has(t));
}
