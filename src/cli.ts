import { Command } from 'commander';

export function buildProgram(): Command {
  const program = new Command();
  program
    .name('seh')
    .description('Portable AI coding harness generator')
    .version('0.1.0');
  return program;
}

// Executed when run as a binary.
if (import.meta.url === `file://${process.argv[1]}`) {
  buildProgram().parseAsync(process.argv);
}
