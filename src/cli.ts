#!/usr/bin/env node
import { Command } from 'commander';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import prompts from 'prompts';
import { runInitGlobal } from './commands/initGlobal.js';
import { runInitProject } from './commands/initProject.js';
import { runSync } from './commands/sync.js';
import { runCheck } from './commands/check.js';
import { runLink } from './commands/link.js';
import { detectTechnologies } from './detect.js';
import { SUPPORTED_TECHS } from './catalog.js';
import { TOOL_TARGETS, linkTool } from './links.js';
import { lockFile } from './paths.js';
import fs from 'node:fs';

const parseList = (s?: string) => (s ? s.split(',').map((x) => x.trim()).filter(Boolean) : []);

function fail(err: unknown) {
  console.error(`seh error: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
}

export function buildProgram(): Command {
  const program = new Command();
  program.name('seh').description('Portable AI coding harness generator').version('0.2.0');

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
              choices: Object.keys(TOOL_TARGETS).map((t) => ({ title: t, value: t })),
            });
            if (res.tools === undefined) {
              console.log('seh: cancelled.');
              process.exitCode = 0;
              return;
            }
            tools = res.tools;
          }
          const out = runInitGlobal({ home: os.homedir(), tools, force: opts.force });
          for (const t of tools) linkTool(t, os.homedir());
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
        const out = runInitProject({ root, technologies: techs, force: opts.force });
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
        const res = runSync({ root, technologies: lock.technologies ?? [] });
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
