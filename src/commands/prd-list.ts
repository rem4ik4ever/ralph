import chalk from 'chalk'
import { listPrds } from '../prd/index.js'
import type { PrdStatusType } from '../prd/types.js'

function statusColor(status: PrdStatusType): string {
  switch (status) {
    case 'pending':
      return chalk.gray(status)
    case 'in_progress':
      return chalk.yellow(status)
    case 'completed':
      return chalk.green(status)
  }
}

export async function prdList(): Promise<void> {
  const prds = await listPrds()

  if (prds.length === 0) {
    console.log(chalk.gray('No PRDs found'))
    return
  }

  // Calculate column widths
  const nameWidth = Math.max(4, ...prds.map((p) => p.name.length))
  const descWidth = Math.min(40, Math.max(11, ...prds.map((p) => p.description.length)))
  const statusWidth = 11
  const progressWidth = 8

  // Header
  console.log(
    chalk.bold(
      'NAME'.padEnd(nameWidth) +
        '  ' +
        'DESCRIPTION'.padEnd(descWidth) +
        '  ' +
        'STATUS'.padEnd(statusWidth) +
        '  ' +
        'PROGRESS'
    )
  )

  // Rows
  for (const prd of prds) {
    const desc =
      prd.description.length > descWidth
        ? prd.description.slice(0, descWidth - 3) + '...'
        : prd.description
    const progress = `${prd.tasksCompleted}/${prd.tasksTotal}`

    console.log(
      prd.name.padEnd(nameWidth) +
        '  ' +
        desc.padEnd(descWidth) +
        '  ' +
        statusColor(prd.status).padEnd(statusWidth + 10) + // extra for ansi codes
        '  ' +
        progress.padStart(progressWidth)
    )
  }
}
