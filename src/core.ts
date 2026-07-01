import fs from 'node:fs';
import path from 'node:path';
import { assetsDir } from './paths.js';

export function loadCore(): { principles: string; agentsBase: string } {
  const coreDir = path.join(assetsDir(), 'core');
  return {
    principles: fs.readFileSync(path.join(coreDir, 'PRINCIPLES.md'), 'utf8'),
    agentsBase: fs.readFileSync(path.join(coreDir, 'AGENTS.base.md'), 'utf8'),
  };
}

export function projectTemplateFiles(): { relPath: string; content: string }[] {
  const base = path.join(assetsDir(), 'project-template');
  const harnessDir = path.join(base, '.harness');
  return fs.readdirSync(harnessDir)
    .filter(f => f.endsWith('.md'))
    .map(f => ({
      relPath: path.join('.harness', f),
      content: fs.readFileSync(path.join(harnessDir, f), 'utf8'),
    }));
}
