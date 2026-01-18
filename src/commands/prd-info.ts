import chalk from 'chalk'
import { getPrdInfo } from '../prd/index.js'
import type { PrdInfo } from '../prd/types.js'

function statusLabel(status: PrdInfo['status']): string {
  switch (status) {
    case 'not_found':
      return chalk.red('not_found')
    case 'partial':
      return chalk.yellow('partial (not registered)')
    case 'pending':
      return chalk.gray('pending')
    case 'in_progress':
      return chalk.yellow('in_progress')
    case 'completed':
      return chalk.green('completed')
  }
}

function fileLabel(exists: boolean, path: string): string {
  if (exists) {
    return path
  }
  return chalk.gray('(not created)')
}

function iterationsLabel(exists: boolean, path: string, fileCount: number): string {
  if (exists) {
    return `${path} (${fileCount} files)`
  }
  return chalk.gray('(not created)')
}

export async function prdInfo(name: string): Promise<void> {
  const info = await getPrdInfo(name)

  if (!info.found) {
    console.error(chalk.red(`Error: PRD '${name}' not found`))
    process.exit(1)
  }

  console.log()
  console.log(`${chalk.bold('PRD:')} ${info.name}`)

  if (info.status === 'partial') {
    console.log(`${chalk.bold('Status:')} ${statusLabel(info.status)}`)
  } else {
    console.log(
      `${chalk.bold('Status:')} ${statusLabel(info.status)} (${info.tasksCompleted}/${info.tasksTotal} tasks complete)`
    )
  }

  console.log()
  console.log(chalk.bold('Files:'))
  console.log(`  prd.md:      ${fileLabel(info.files.prdMd.exists, info.files.prdMd.path)}`)

  if (info.status === 'partial') {
    console.log(`  prd.json:    ${chalk.gray("(not created - run 'ralph prd add')")}`)
    console.log(`  progress:    ${chalk.gray('(not created)')}`)
  } else {
    console.log(`  prd.json:    ${fileLabel(info.files.prdJson.exists, info.files.prdJson.path)}`)
    console.log(`  progress:    ${fileLabel(info.files.progress.exists, info.files.progress.path)}`)
  }

  console.log(
    `  iterations:  ${iterationsLabel(
      info.files.iterations.exists,
      info.files.iterations.path,
      info.files.iterations.fileCount
    )}`
  )
  console.log()
}
