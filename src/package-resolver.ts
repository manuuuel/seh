import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { stackModule as bundledStackModule } from './catalog.js';
import {
  packageGlobalAgentsMd,
  packageTemplatesStackDir,
  packageProjectsDir,
  packageTemplatesProjectDir,
  packageHarnessJson,
} from './paths.js';
import { readGlobalConfig } from './links.js';
import type { HarnessPackage, SkillEntry } from './types.js';

export class PackageResolver {
  constructor(private readonly packagePath: string | null) {}

  get active(): boolean { return this.packagePath !== null; }
  get path(): string | null { return this.packagePath; }

  stackModule(tech: string): string {
    if (this.packagePath) {
      const f = path.join(packageTemplatesStackDir(this.packagePath), `${tech}.md`);
      if (fs.existsSync(f)) return fs.readFileSync(f, 'utf8');
    }
    return bundledStackModule(tech);
  }

  globalAgentsMd(): string | null {
    if (!this.packagePath) return null;
    const p = packageGlobalAgentsMd(this.packagePath);
    return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
  }

  projectOverlayFiles(repoName: string): { relPath: string; content: string }[] {
    if (!this.packagePath) return [];
    const overlayDir = path.join(packageProjectsDir(this.packagePath), repoName);
    if (!fs.existsSync(overlayDir)) return [];
    const result: { relPath: string; content: string }[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const abs = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(abs);
        else if (entry.name.endsWith('.md')) {
          result.push({
            relPath: path.relative(overlayDir, abs),
            content: fs.readFileSync(abs, 'utf8'),
          });
        }
      }
    };
    walk(overlayDir);
    return result;
  }

  projectTemplateNames(): string[] {
    if (!this.packagePath) return [];
    const dir = packageTemplatesProjectDir(this.packagePath);
    if (!fs.existsSync(dir)) return [];
    return fs.readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .sort();
  }

  projectTemplateFiles(name: string): { relPath: string; content: string }[] {
    if (!this.packagePath) return [];
    const templateDir = path.join(packageTemplatesProjectDir(this.packagePath), name);
    if (!fs.existsSync(templateDir)) return [];
    const result: { relPath: string; content: string }[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const abs = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(abs);
        else if (entry.name.endsWith('.md')) {
          result.push({
            relPath: path.relative(templateDir, abs),
            content: fs.readFileSync(abs, 'utf8'),
          });
        }
      }
    };
    walk(templateDir);
    return result;
  }

  skills(): Record<string, SkillEntry> {
    if (!this.packagePath) return {};
    const p = packageHarnessJson(this.packagePath);
    if (!fs.existsSync(p)) return {};
    const harness: HarnessPackage = JSON.parse(fs.readFileSync(p, 'utf8'));
    return harness.skills ?? {};
  }
}

export function readResolver(home: string = os.homedir()): PackageResolver {
  try {
    const cfg = readGlobalConfig(home);
    return new PackageResolver(cfg.packagePath ?? null);
  } catch {
    return new PackageResolver(null);
  }
}
