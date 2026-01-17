#!/usr/bin/env node
import { program } from 'commander'
import { run } from './commands/run.js'
import { prdAdd } from './commands/prd-add.js'
import { prdList } from './commands/prd-list.js'

program
  .name('ralph')
  .description('Loop coding agent CLI - run agents headlessly in a loop')
  .version('0.1.0')

program
  .command('run')
  .description('Run PRD tasks in a loop')
  .argument('<prd-name>', 'Name of PRD to run')
  .option('-a, --agent <agent>', 'Agent type', 'claude')
  .option('-i, --iterations <n>', 'Number of loop iterations', '4')
  .action(run)

const prd = program.command('prd').description('Manage PRDs')

prd
  .command('add')
  .description('Add a new PRD from markdown file')
  .argument('<path>', 'Path to PRD markdown file')
  .argument('<name>', 'Name for the PRD')
  .option('-a, --agent <agent>', 'Agent type', 'claude')
  .action(prdAdd)

prd.command('list').description('List all PRDs').action(prdList)

program.parse()
