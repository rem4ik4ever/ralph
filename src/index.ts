#!/usr/bin/env node
import { program } from 'commander'
import { run } from './commands/run.js'

program
  .name('ralph')
  .description('Loop coding agent CLI - run agents headlessly in a loop')
  .version('0.1.0')

program
  .command('run')
  .description('Run an agent in a loop')
  .requiredOption('-p, --prompt <files...>', 'Prompt files to pass to agent')
  .option('-a, --agent <agent>', 'Agent type', 'claude')
  .option('-i, --iterations <n>', 'Number of loop iterations', '4')
  .action(run)

program.parse()
