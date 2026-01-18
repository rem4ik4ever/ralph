import chalk from 'chalk'
import { confirm } from '@inquirer/prompts'
import { rm } from 'node:fs/promises'
import { getPrdInfo } from '../prd/index.js'

export interface PrdDeleteOptions {
  force?: boolean
}

export async function prdDelete(name: string, opts: PrdDeleteOptions): Promise<void> {
  const info = await getPrdInfo(name)

  if (!info.found) {
    console.error(chalk.red(`Error: PRD '${name}' not found`))
    process.exit(1)
  }

  // Build list of files to delete
  const filesToDelete: string[] = []
  if (info.files.prdMd.exists) filesToDelete.push(info.files.prdMd.path)
  if (info.files.prdJson.exists) filesToDelete.push(info.files.prdJson.path)
  if (info.files.progress.exists) filesToDelete.push(info.files.progress.path)
  if (info.files.iterations.exists) {
    filesToDelete.push(`${info.files.iterations.path}/ (${info.files.iterations.fileCount} files)`)
  }

  // Prompt for confirmation unless --force
  if (!opts.force) {
    console.log()
    console.log(`Delete PRD '${name}'? This will remove:`)
    for (const file of filesToDelete) {
      console.log(`  - ${file}`)
    }
    console.log()

    try {
      const confirmed = await confirm({
        message: 'Confirm?',
        default: false,
      })

      if (!confirmed) {
        console.log(chalk.gray('Delete cancelled'))
        return
      }
    } catch {
      // Ctrl+C
      console.log(chalk.gray('Delete cancelled'))
      return
    }
  }

  // Get the PRD directory (parent of prd.md)
  const prdDir = info.files.prdMd.path.replace(/\/prd\.md$/, '')

  // Delete the entire PRD directory
  await rm(prdDir, { recursive: true, force: true })

  console.log(chalk.green(`Deleted PRD '${name}'`))
}
