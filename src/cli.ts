import { Command } from 'commander';
import { runSync } from './commands/sync.js';

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

  return program;
}

// Executed when run as a binary.
if (import.meta.url === `file://${process.argv[1]}`) {
  buildProgram().parseAsync(process.argv);
}
