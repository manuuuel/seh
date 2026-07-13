#!/usr/bin/env node
import { Command } from 'commander';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import prompts from 'prompts';
import { spawnSync } from 'node:child_process';
import type { SkillInvoke, MemoryType } from './types.js';
import { runInitGlobal } from './commands/initGlobal.js';
import { runInitProject } from './commands/initProject.js';
import { runSync } from './commands/sync.js';
import { runCheck } from './commands/check.js';
import { runLink } from './commands/link.js';
import { runPackageInit, runPackageUse, runPackageStatus } from './commands/package.js';
import { runSkillsAdd, runSkillsUpdate, runSkillsList } from './commands/skills.js';
import { runPackageInstall } from './commands/install.js';
import { runMemoryAdd, runMemoryList, runMemoryRemove } from './commands/memory.js';
import { detectTechnologies } from './detect.js';
import { SUPPORTED_TECHS } from './catalog.js';
import { SUPPORTED_AGENTS, SKILL_TARGETS, linkAgent, readConfiguredAgents, readGlobalConfig } from './links.js';
import { lockFile } from './paths.js';
import { readResolver } from './package-resolver.js';
import fs from 'node:fs';

const parseList = (s?: string) => (s ? s.split(',').map((x) => x.trim()).filter(Boolean) : []);

function fail(err: unknown) {
  console.error(`seh error: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
}

export function buildProgram(): Command {
  const program = new Command();
  program.name('seh').description('Portable AI coding harness generator').version('0.3.0');

  const resolver = readResolver(os.homedir());

  program
    .command('init')
    .description('Initialize the global harness (--global) or the current project')
    .option('-g, --global', 'set up the host-level global harness (~/.seh)')
    .option('-f, --force', 'overwrite existing files')
    .option('--tech <list>', 'comma-separated technologies (non-interactive)')
    .option('--agents <list>', 'comma-separated agents to symlink (global, non-interactive)')
    .option('-y, --yes', 'accept detected technologies without prompting')
    .action(async (opts) => {
      try {
        if (opts.global) {
          let agents = parseList(opts.agents);
          if (!opts.yes && agents.length === 0) {
            const res = await prompts({
              type: 'multiselect', name: 'agents', message: 'Symlink into which agents?',
              choices: SUPPORTED_AGENTS.map((t) => ({ title: t, value: t })),
            });
            if (res.agents === undefined) {
              console.log('seh: cancelled.');
              process.exitCode = 0;
              return;
            }
            agents = res.agents;
          }
          const out = runInitGlobal({ home: os.homedir(), agents, force: opts.force, resolver });
          for (const t of agents) linkAgent('global', t, os.homedir());
          console.log(`seh: global ready [${out.created.join(', ')}] agents [${agents.join(', ') || 'none'}]`);
          return;
        }
        const root = process.cwd();
        let techs = parseList(opts.tech);
        if (techs.length === 0) {
          const detected = detectTechnologies(root);
          if (opts.yes) techs = detected;
          else {
            const res = await prompts({
              type: 'multiselect', name: 'techs', message: 'Select technologies',
              choices: SUPPORTED_TECHS.map((t) => ({ title: t, value: t, selected: detected.includes(t) })),
              min: 1,
            });
            if (res.techs === undefined) {
              console.log('seh: cancelled.');
              process.exitCode = 0;
              return;
            }
            techs = res.techs;
          }
        }
        let templateName: string | undefined;
        if (!opts.yes && resolver.active) {
          const templates = resolver.projectTemplateNames();
          if (templates.length > 0) {
            const res = await prompts({
              type: 'select',
              name: 'template',
              message: 'Use a project template from your package?',
              choices: [
                { title: '(none — bare stack selection)', value: '' },
                ...templates.map((t) => ({ title: t, value: t })),
              ],
            });
            if (res.template === undefined) {
              console.log('seh: cancelled.');
              process.exitCode = 0;
              return;
            }
            templateName = res.template || undefined;
          }
        }
        const out = runInitProject({
          root, technologies: techs,
          force: opts.force,
          projectAgents: readConfiguredAgents(os.homedir()),
          home: os.homedir(),
          resolver,
          templateName,
        });
        console.log(`seh: project ready [created ${out.created.length}, synced ${out.synced.join(', ')}]`);
      } catch (err) { fail(err); }
    });

  program
    .command('sync')
    .description('Regenerate the project index + stack modules from seh.lock')
    .action(() => {
      try {
        const root = process.cwd();
        const lock = JSON.parse(fs.readFileSync(lockFile(root), 'utf8'));
        const res = runSync({ root, technologies: lock.technologies ?? [], home: os.homedir(), resolver });
        console.log(`seh: wrote ${res.written.join(', ')}`);
      } catch (err) { fail(err); }
    });

  program
    .command('check')
    .description('Detect drift between .seh sources and generated files')
    .action(() => {
      try {
        const res = runCheck({ root: process.cwd() });
        if (res.ok) { console.log('seh: no drift.'); return; }
        if (res.missing.length) console.error(`seh: missing ${res.missing.join(', ')}`);
        if (res.drift.length) console.error(`seh: stale ${res.drift.join(', ')} (run \`seh sync\`)`);
        process.exitCode = 1;
      } catch (err) { fail(err); }
    });

  program
    .command('link')
    .description('Add or remove global tool symlinks')
    .option('--add <list>', 'comma-separated tools to link')
    .option('--remove <list>', 'comma-separated tools to unlink')
    .action((opts) => {
      try {
        const res = runLink({ home: os.homedir(), add: parseList(opts.add), remove: parseList(opts.remove) });
        console.log(`seh: linked [${res.agents.join(', ') || 'none'}]`);
      } catch (err) { fail(err); }
    });

  function parseSkillUrl(raw: string): { url: string; skillName: string } {
    const ghShorthand = raw.match(/^github:([^/]+)\/([^/]+)$/);
    if (ghShorthand) return { url: `https://github.com/${ghShorthand[1]}/${ghShorthand[2]}`, skillName: ghShorthand[2] };
    const ghUrl = raw.match(/^https?:\/\/github\.com\/([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
    if (ghUrl) return { url: raw, skillName: ghUrl[2] };
    throw new Error(`Unsupported URL: ${raw}. Use https://github.com/owner/repo or github:owner/repo`);
  }

  const pkg = program.command('package').description('Manage harness packages');

  pkg
    .command('init [path]')
    .description('Scaffold a new harness package')
    .option('-f, --force', 'overwrite existing package')
    .action(async (pkgPath: string | undefined, opts: { force?: boolean }) => {
      try {
        const packagePath = path.resolve(pkgPath ?? 'my-harness');
        const res = runPackageInit({ packagePath, home: os.homedir(), force: opts.force });
        console.log(`seh: package created at ${packagePath} [${res.created.length} files]`);
        console.log(`  Next: cd ${packagePath} && git init && git add . && git commit -m "init harness"`);
      } catch (err) { fail(err); }
    });

  pkg
    .command('use <path>')
    .description('Point seh at an existing harness package')
    .action((pkgPath: string) => {
      try {
        runPackageUse({ packagePath: pkgPath, home: os.homedir() });
        console.log(`seh: active package → ${path.resolve(pkgPath)}`);
      } catch (err) { fail(err); }
    });

  pkg
    .command('status')
    .description('Show the active harness package')
    .action(() => {
      try {
        const status = runPackageStatus({ home: os.homedir() });
        if (!status.packagePath) { console.log('seh: no active package'); return; }
        console.log(`seh: active package ${status.packagePath}`);
        if (status.pkg) console.log(`  name: ${status.pkg.name}  version: ${status.pkg.version}`);
        for (const [dir, exists] of Object.entries(status.dirs)) {
          console.log(`  ${exists ? '✓' : '✗'} ${dir}`);
        }
      } catch (err) { fail(err); }
    });

  pkg
    .command('install')
    .description('Install harness and/or skills from the active package onto this machine')
    .option('--skills', 'install skills')
    .option('--harness', 'install global harness (AGENTS.md + agent symlinks)')
    .option('--all', 'install everything')
    .option('--agents <list>', 'comma-separated agents to link skills into')
    .option('-f, --force', 'overwrite existing files')
    .action(async (opts: { skills?: boolean; harness?: boolean; all?: boolean; agents?: string; force?: boolean }) => {
      try {
        let agents = parseList(opts.agents);
        if ((opts.skills || opts.all) && agents.length === 0) {
          const configured = readGlobalConfig(os.homedir()).agents;
          const res = await prompts({
            type: 'multiselect', name: 'agents', message: 'Install skills into which agents?',
            choices: SUPPORTED_AGENTS
              .filter((a) => a in SKILL_TARGETS)
              .map((a) => ({ title: a, value: a, selected: configured.includes(a) })),
          });
          if (res.agents === undefined) { console.log('seh: cancelled.'); process.exitCode = 0; return; }
          agents = res.agents;
        }
        const result = runPackageInstall({
          skills: opts.skills,
          harness: opts.harness,
          all: opts.all,
          agents,
          force: opts.force,
          home: os.homedir(),
        });
        if (result.installedHarness) console.log('seh: harness installed');
        if (result.installedSkills.length > 0) console.log(`seh: skills installed [${result.installedSkills.join(', ')}]`);
      } catch (err) { fail(err); }
    });

  const skills = program.command('skills').description('Manage skills in the active harness package');

  skills
    .command('add <url>')
    .description('Add a skill from a GitHub URL to the active package')
    .option('--vendor', 'copy skill files into the package (committed to git)')
    .option('--reference', 'track skill as external reference (fetched on install)')
    .option('--ref <branch>', 'branch or tag (default: main)')
    .option('-f, --force', 'overwrite existing skill')
    .option('--always [label]', 'invoke this skill every response')
    .option('--when <condition>', 'invoke this skill when condition matches')
    .option('--optional', 'skill available, agent decides when to use it')
    .action(async (url: string, opts: { vendor?: boolean; reference?: boolean; ref?: string; force?: boolean; always?: string | boolean; when?: string; optional?: boolean }) => {
      try {
        const { url: resolvedUrl, skillName } = parseSkillUrl(url);

        const routingFlagCount = [opts.always !== undefined, !!opts.when, !!opts.optional].filter(Boolean).length;
        if (routingFlagCount > 1) {
          fail(new Error('--always, --when, and --optional are mutually exclusive'));
          return;
        }

        let type: 'vendor' | 'reference' | undefined;
        if (opts.vendor) type = 'vendor';
        else if (opts.reference) type = 'reference';
        else {
          const res = await prompts({
            type: 'select', name: 'type', message: 'How to add this skill?',
            choices: [
              { title: 'Vendor (copy into package, commit to git)', value: 'vendor' },
              { title: 'Reference (track externally, fetch on install)', value: 'reference' },
            ],
          });
          if (res.type === undefined) { console.log('seh: cancelled.'); process.exitCode = 0; return; }
          type = res.type as 'vendor' | 'reference';
        }

        let invoke: SkillInvoke | undefined;
        if (opts.always !== undefined) {
          invoke = { mode: 'always', label: typeof opts.always === 'string' ? opts.always : undefined };
        } else if (opts.when) {
          invoke = { mode: 'when', condition: opts.when };
        } else if (opts.optional) {
          invoke = { mode: 'optional' };
        }

        const status = runPackageStatus({ home: os.homedir() });
        if (!status.packagePath) throw new Error('No active package. Run `seh package use <path>` first.');
        runSkillsAdd({ url: resolvedUrl, skillName, type, ref: opts.ref, packagePath: status.packagePath, force: opts.force, invoke });
        console.log(`seh: skill '${skillName}' added (${type})`);
      } catch (err) { fail(err); }
    });

  skills
    .command('update [name]')
    .description('Re-fetch referenced skill(s) from source')
    .action((name: string | undefined) => {
      try {
        const status = runPackageStatus({ home: os.homedir() });
        if (!status.packagePath) throw new Error('No active package.');
        const { updated } = runSkillsUpdate({ skillName: name, packagePath: status.packagePath });
        console.log(`seh: updated [${updated.join(', ') || 'none'}]`);
      } catch (err) { fail(err); }
    });

  skills
    .command('list')
    .description('List skills in the active package')
    .action(() => {
      try {
        const status = runPackageStatus({ home: os.homedir() });
        if (!status.packagePath) { console.log('seh: no active package'); return; }
        const { skills: list } = runSkillsList({ packagePath: status.packagePath });
        if (list.length === 0) { console.log('seh: no skills'); return; }
        for (const s of list) {
          const src = s.source ? `  ${s.source} (${s.ref})` : '';
          const disk = s.onDisk ? '✓' : '✗';
          let invokeStr = '';
          if (s.invoke) {
            if (s.invoke.mode === 'always') invokeStr = `  always${s.invoke.label ? `: ${s.invoke.label}` : ''}`;
            else if (s.invoke.mode === 'when') invokeStr = `  when: ${s.invoke.condition}`;
            else if (s.invoke.mode === 'optional') invokeStr = `  optional`;
          }
          console.log(`  ${disk} ${s.name}  [${s.type}]${invokeStr}${src}`);
        }
      } catch (err) { fail(err); }
    });

  const memoryGroup = program.command('memory').description('Manage project memory files in .seh/memory/');

  memoryGroup
    .command('add <name>')
    .description('Create a memory file (default type: decision)')
    .option('--constraint', 'record a hard rule discovered')
    .option('--learning', 'record something non-obvious that cost time')
    .option('--problem', 'record an unresolved issue for next session')
    .action((name: string, opts: { constraint?: boolean; learning?: boolean; problem?: boolean }) => {
      try {
        const typeFlagCount = [opts.constraint, opts.learning, opts.problem].filter(Boolean).length;
        if (typeFlagCount > 1) {
          fail(new Error('--constraint, --learning, and --problem are mutually exclusive'));
          return;
        }
        let type: MemoryType = 'decision';
        if (opts.constraint) type = 'constraint';
        else if (opts.learning) type = 'learning';
        else if (opts.problem) type = 'problem';
        const { filePath, created } = runMemoryAdd({ root: process.cwd(), name, type });
        if (!created) {
          console.log(`seh: memory '${name}' already exists at ${filePath}`);
        } else {
          const editor = process.env['EDITOR'];
          if (editor) {
            const [bin, ...editorArgs] = editor.split(/\s+/);
            spawnSync(bin!, [...editorArgs, filePath], { stdio: 'inherit' });
          } else {
            console.log(`seh: created ${filePath}`);
          }
        }
      } catch (err) { fail(err); }
    });

  memoryGroup
    .command('list')
    .description('List memory files grouped by type')
    .action(() => {
      try {
        const { entries } = runMemoryList({ root: process.cwd() });
        if (entries.length === 0) { console.log('seh: no memory files'); return; }
        const byType = (type: string) => entries.filter((e) => e.type === type);
        const print = (label: string, type: string) => {
          const es = byType(type);
          if (es.length === 0) return;
          console.log(`\n${label}`);
          for (const e of es) console.log(`  ${e.name}  ${e.title}`);
        };
        print('Decisions', 'decision');
        print('Constraints', 'constraint');
        print('Learnings', 'learning');
        print('Open problems', 'problem');
      } catch (err) { fail(err); }
    });

  memoryGroup
    .command('remove <name>')
    .description('Delete a memory file')
    .action((name: string) => {
      try {
        runMemoryRemove({ root: process.cwd(), name });
        console.log(`seh: removed memory '${name}'`);
      } catch (err) { fail(err); }
    });

  return program;
}

function isMainModule(): boolean {
  const argv1 = process.argv[1];
  if (!argv1) return false;
  try {
    return fs.realpathSync(fileURLToPath(import.meta.url)) === fs.realpathSync(argv1);
  } catch {
    return false;
  }
}
if (isMainModule()) {
  buildProgram().parseAsync(process.argv);
}
