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
  .requiredOption('-t, --task <task>', 'Task prompt for the agent')
  .option('-a, --agent <agent>', 'Agent type', 'claude')
  .option('-i, --iterations <n>', 'Number of loop iterations', '4')
  .option('-c, --context <files...>', 'Context files to include in prompt')
  .action(run)

program.parse()
