import { Command } from 'commander';
import { runSync } from './commands/sync.js';
import { runCheck } from './commands/check.js';

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

  return program;
}

// Executed when run as a binary.
if (import.meta.url === `file://${process.argv[1]}`) {
  buildProgram().parseAsync(process.argv);
}
