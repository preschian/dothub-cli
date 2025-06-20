import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { collectFilebaseCredentials, collectMnemonic } from './prompts.js'

export interface UserConfig {
  mnemonic: string
  filebaseKey: string
  filebaseSecret: string
  filebaseBucket: string
}

const CONFIG_DIR = '/tmp/dot-nft'
const CONFIG_FILE = join(CONFIG_DIR, 'config.json')

export async function setupConfig(): Promise<UserConfig> {
  const mnemonic = await collectMnemonic()
  const filebaseCredentials = await collectFilebaseCredentials()

  const config: UserConfig = {
    mnemonic,
    filebaseKey: filebaseCredentials.key,
    filebaseSecret: filebaseCredentials.secret,
    filebaseBucket: filebaseCredentials.bucket,
  }

  return config
}

export function saveConfig(config: UserConfig): void {
  try {
    // Ensure config directory exists
    if (!existsSync(CONFIG_DIR)) {
      mkdirSync(CONFIG_DIR, { recursive: true })
    }

    // Save config (note: in production, consider encrypting sensitive data)
    writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 })
  }
  catch (error) {
    console.error('Failed to save configuration:', error)
    process.exit(1)
  }
}

export async function loadConfig(): Promise<UserConfig | null> {
  try {
    if (!existsSync(CONFIG_FILE)) {
      return null
    }

    const configData = Bun.file(CONFIG_FILE)
    return JSON.parse(await configData.text()) as UserConfig
  }
  catch (error) {
    console.error('Failed to load configuration:', error)
    return null
  }
}

export function getConfigPath(): string {
  return CONFIG_FILE
}
