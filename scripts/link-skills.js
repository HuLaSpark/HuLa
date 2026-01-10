import { checkbox } from '@inquirer/prompts'
import { openSync, promises as fs } from 'fs'
import path from 'path'
import { ReadStream, WriteStream } from 'node:tty'
import { styleText } from 'node:util'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const repoRoot = path.resolve(__dirname, '..')
const skillsRoot = path.join(repoRoot, 'skills')

async function main() {
  const shouldSkip = process.env.HULA_SKIP_SKILL_LINK || process.env.CI
  const isLifecycle = Boolean(process.env.npm_lifecycle_event)
  const canPrompt = Boolean(process.stdin.isTTY && process.stdout.isTTY)
  const forcePrompt = process.env.HULA_FORCE_SKILL_LINK === '1'

  if (shouldSkip) {
    console.log('已跳过技能链接：检测到 HULA_SKIP_SKILL_LINK 或 CI。')
    return
  }

  const homeDir = process.env.HOME || process.env.USERPROFILE
  if (!homeDir) {
    console.log('已跳过技能链接：未检测到 HOME 或 USERPROFILE。')
    return
  }

  let skillDirs = []
  try {
    const entries = await fs.readdir(skillsRoot, { withFileTypes: true })
    skillDirs = entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name)
  } catch {
    console.log(`已跳过技能链接：无法读取 ${skillsRoot}。`)
    return
  }

  if (skillDirs.length === 0) {
    console.log(`已跳过技能链接：${skillsRoot} 下未找到技能目录。`)
    return
  }

  const codexHome = process.env.CODEX_HOME || path.join(homeDir, '.codex')
  const claudeHome = process.env.CLAUDE_HOME || path.join(homeDir, '.claude')

  const targets = [
    {
      id: 'codex',
      name: 'Codex',
      dir: path.join(codexHome, 'skills')
    },
    {
      id: 'claude',
      name: 'Claude',
      dir: path.join(claudeHome, 'skills')
    }
  ]

  const targetsWithStatus = []
  for (const target of targets) {
    const status = await getTargetLinkStatus(target.dir, skillsRoot, skillDirs)
    targetsWithStatus.push({ ...target, status })
  }

  if (targetsWithStatus.every((target) => target.status.allLinked)) {
    console.log('已跳过技能链接：目标目录已全部链接。')
    return
  }

  if (isLifecycle && !forcePrompt) {
    const pending = targetsWithStatus.filter((target) => !target.status.allLinked)
    const pendingNames = pending.map((target) => target.name).join(', ')
    console.log(`技能链接待处理：${pendingNames}。`)
    console.log('请运行 `node scripts/link-skills.js` 进行链接。')
    return
  }

  if (!canPrompt && !forcePrompt) {
    console.log('已跳过技能链接：当前为非交互终端。')
    console.log('请在终端运行 `node scripts/link-skills.js` 进行链接。')
    return
  }

  let promptContext = null
  let cleanupPromptContext = () => {}

  if (!canPrompt) {
    const fallback = createConsolePromptContext()
    if (!fallback) {
      console.log('已跳过技能链接：无法打开控制台用于交互。')
      return
    }
    promptContext = fallback.context
    cleanupPromptContext = fallback.cleanup
  }

  try {
    const useChineseHelp = isChineseLocale()
    const allTargetsValue = '__all__'
    const keyLabelMap = useChineseHelp
      ? new Map([
          ['space', '空格'],
          ['⏎', '回车']
        ])
      : null
    const actionLabelMap = useChineseHelp
      ? new Map([
          ['navigate', '移动'],
          ['select', '选择'],
          ['all', '全选'],
          ['invert', '反选'],
          ['submit', '提交']
        ])
      : null
    const selectedTargets = await checkbox(
      {
        message: '请选择要链接的目标：',
        required: true,
        theme: {
          icon: {
            checked: '✓',
            unchecked: '○',
            cursor: '❯'
          },
          style: {
            keysHelpTip: (keys) =>
              keys
                .map(([key, action]) => {
                  const keyLabel = keyLabelMap?.get(key) ?? key
                  const actionLabel = actionLabelMap?.get(action) ?? action
                  return `${styleText('bold', keyLabel)} ${styleText('dim', actionLabel)}`
                })
                .join(styleText('dim', ' · '))
          }
        },
        choices: [
          {
            name: '链接全部未链接目标',
            value: allTargetsValue,
            checked: false
          },
          ...targetsWithStatus.map((target) => ({
            name: `${target.name} (${target.dir})`,
            value: target.id,
            checked: false,
            disabled: target.status.allLinked ? '已链接' : false
          }))
        ]
      },
      promptContext ?? undefined
    )

    const shouldLinkAll = selectedTargets.includes(allTargetsValue)
    const selectedIds = shouldLinkAll
      ? targetsWithStatus.filter((target) => !target.status.allLinked).map((target) => target.id)
      : selectedTargets.filter((value) => value !== allTargetsValue)

    if (selectedIds.length === 0) {
      console.log('已跳过技能链接：未选择目标。')
      return
    }

    for (const target of targetsWithStatus) {
      if (!selectedIds.includes(target.id)) {
        continue
      }
      await linkSkillsToTarget(target.dir, skillsRoot, skillDirs)
    }
  } finally {
    cleanupPromptContext()
  }
}

main().catch((error) => {
  console.log('技能链接失败。')
  if (error instanceof Error) {
    console.log(error.message)
  }
})

function isChineseLocale() {
  const candidates = [
    process.env.LC_ALL,
    process.env.LC_MESSAGES,
    process.env.LANG,
    Intl.DateTimeFormat().resolvedOptions().locale
  ].filter(Boolean)

  const locale = candidates.join(' ').toLowerCase()
  return locale.includes('zh')
}

function createConsolePromptContext() {
  const isWindows = process.platform === 'win32'
  const candidates = isWindows
    ? [
        { input: '\\\\.\\CONIN$', output: '\\\\.\\CONOUT$' },
        { input: 'CONIN$', output: 'CONOUT$' }
      ]
    : [{ input: '/dev/tty', output: '/dev/tty' }]

  for (const candidate of candidates) {
    try {
      const inputFd = openSync(candidate.input, 'r')
      const outputFd = openSync(candidate.output, 'w')
      const input = new ReadStream(inputFd)
      const output = new WriteStream(outputFd)
      return {
        context: { input, output },
        cleanup: () => {
          input.destroy()
          output.destroy()
        }
      }
    } catch {}
  }

  return null
}

async function getTargetLinkStatus(targetDir, sourceRoot, skillNames) {
  let linkedCount = 0

  for (const skillName of skillNames) {
    const source = path.join(sourceRoot, skillName)
    const dest = path.join(targetDir, skillName)
    if (await isSkillLinked(source, dest)) {
      linkedCount += 1
    }
  }

  return {
    allLinked: linkedCount === skillNames.length
  }
}

async function isSkillLinked(source, dest) {
  let destStat = null
  try {
    destStat = await fs.lstat(dest)
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.log(`已跳过技能链接：无法检查 ${dest}。`)
    }
    return false
  }

  if (!destStat.isSymbolicLink()) {
    return false
  }

  try {
    const [destResolved, sourceResolved] = await Promise.all([fs.realpath(dest), fs.realpath(source)])
    return destResolved === sourceResolved
  } catch {
    return false
  }
}

async function linkSkillsToTarget(targetDir, sourceRoot, skillNames) {
  await fs.mkdir(targetDir, { recursive: true })
  const sourceRootResolved = await fs.realpath(sourceRoot)

  for (const skillName of skillNames) {
    const source = path.join(sourceRootResolved, skillName)
    const dest = path.join(targetDir, skillName)
    await ensureLink(source, dest)
  }
}

async function ensureLink(source, dest) {
  const sourceResolved = await fs.realpath(source)
  let destStat = null

  try {
    destStat = await fs.lstat(dest)
  } catch (error) {
    if (error.code !== 'ENOENT') {
      console.log(`已跳过技能链接：无法检查 ${dest}。`)
      return
    }
  }

  if (destStat) {
    if (destStat.isSymbolicLink()) {
      try {
        const destResolved = await fs.realpath(dest)
        if (destResolved === sourceResolved) {
          console.log(`技能链接已存在：${dest}`)
          return
        }
      } catch {
        console.log(`已跳过技能链接：${dest} 处的链接无效。`)
        return
      }
    }

    console.log(`已跳过技能链接：${dest} 已存在。`)
    return
  }

  try {
    if (process.platform === 'win32') {
      await fs.symlink(sourceResolved, dest, 'junction')
    } else {
      await fs.symlink(sourceResolved, dest)
    }
    console.log(`已创建技能链接：${dest} -> ${sourceResolved}`)
  } catch {
    console.log(`技能链接失败：${dest}`)
  }
}
