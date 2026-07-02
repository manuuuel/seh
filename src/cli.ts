import { Command } from 'commander';
import { fileURLToPath } from 'node:url';

export function buildProgram(): Command {
  const program = new Command();
  program
    .name('seh')
    .description('Portable AI coding harness generator')
    .version('0.2.0');
  return program;
}

const isMainModule = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMainModule) {
  buildProgram().parseAsync(process.argv);
}
