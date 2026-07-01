import { Command } from 'commander';
import os from 'node:os';
import { fileURLToPath } from 'node:url';
import { runSync } from './commands/sync.js';
import { runCheck } from './commands/check.js';
import { runInitGlobal } from './commands/initGlobal.js';
import { runInitProject } from './commands/initProject.js';

export function buildProgram(): Command {
  const program = new Command();
  program
    .name('seh')
    .description('Portable AI coding harness generator')
    .version('0.1.0');

  program
    .command('sync')
    .description('Generate tool entrypoints from .harness sources')
    .option('-a, --adapters <list>', 'comma-separated adapters', 'claude,agents')
    .action((opts: { adapters: string }) => {
      const res = runSync({ root: process.cwd(), adapters: opts.adapters.split(',') });
      console.log(`seh: wrote ${res.written.join(', ')}`);
    });

  program
    .command('check')
    .description('Detect drift between .harness sources and generated files')
    .option('-a, --adapters <list>', 'comma-separated adapters', 'claude,agents')
    .action((opts: { adapters: string }) => {
      const res = runCheck({ root: process.cwd(), adapters: opts.adapters.split(',') });
      if (res.ok) { console.log('seh: no drift.'); return; }
      if (res.missing.length) console.error(`seh: missing ${res.missing.join(', ')}`);
      if (res.drift.length) console.error(`seh: stale ${res.drift.join(', ')} (run \`seh sync\`)`);
      process.exitCode = 1;
    });

  program
    .command('init')
    .description('Initialize the global harness (--global) or the current project')
    .option('-g, --global', 'set up the host-level global harness (~/.se-harness)')
    .option('-f, --force', 'overwrite existing files')
    .action((opts: { global?: boolean; force?: boolean }) => {
      if (opts.global) {
        const res = runInitGlobal({ home: os.homedir(), force: opts.force });
        console.log(`seh: global created [${res.created.join(', ')}] skipped [${res.skipped.join(', ')}]`);
        return;
      }
      const res = runInitProject({ root: process.cwd(), force: opts.force });
      const stacks = Object.entries(res.detected).filter(([, v]) => v).map(([k]) => k);
      console.log(`seh: project created [${res.created.join(', ')}] skipped [${res.skipped.join(', ')}]`);
      if (stacks.length) console.log(`seh: detected ${stacks.join(', ')} — fill in .harness/stack.md`);
      console.log('seh: edit .harness/*, then run `seh sync`.');
    });

  return program;
}

// Executed when run as a binary.
const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMainModule) {
  buildProgram().parseAsync(process.argv);
}
