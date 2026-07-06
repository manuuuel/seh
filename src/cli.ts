#!/usr/bin/env node
import { Command } from 'commander';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import prompts from 'prompts';
import { runInitGlobal } from './commands/initGlobal.js';
import { runInitProject } from './commands/initProject.js';
import { runSync } from './commands/sync.js';
import { runCheck } from './commands/check.js';
import { runLink } from './commands/link.js';
import { runPackageInit, runPackageUse, runPackageStatus } from './commands/package.js';
import { detectTechnologies } from './detect.js';
import { SUPPORTED_TECHS } from './catalog.js';
import { SUPPORTED_TOOLS, linkTool, readConfiguredTools } from './links.js';
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
  program.name('seh').description('Portable AI coding harness generator').version('0.2.0');

  const resolver = readResolver(os.homedir());

  program
    .command('init')
    .description('Initialize the global harness (--global) or the current project')
    .option('-g, --global', 'set up the host-level global harness (~/.seh)')
    .option('-f, --force', 'overwrite existing files')
    .option('--tech <list>', 'comma-separated technologies (non-interactive)')
    .option('--tools <list>', 'comma-separated tools to symlink (global, non-interactive)')
    .option('-y, --yes', 'accept detected technologies without prompting')
    .action(async (opts) => {
      try {
        if (opts.global) {
          let tools = parseList(opts.tools);
          if (!opts.yes && tools.length === 0) {
            const res = await prompts({
              type: 'multiselect', name: 'tools', message: 'Symlink into which tools?',
              choices: SUPPORTED_TOOLS.map((t) => ({ title: t, value: t })),
            });
            if (res.tools === undefined) {
              console.log('seh: cancelled.');
              process.exitCode = 0;
              return;
            }
            tools = res.tools;
          }
          const out = runInitGlobal({ home: os.homedir(), tools, force: opts.force, resolver });
          for (const t of tools) linkTool('global', t, os.homedir());
          console.log(`seh: global ready [${out.created.join(', ')}] tools [${tools.join(', ') || 'none'}]`);
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
          projectTools: readConfiguredTools(os.homedir()),
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
        console.log(`seh: linked [${res.tools.join(', ') || 'none'}]`);
      } catch (err) { fail(err); }
    });

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
