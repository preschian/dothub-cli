#!/usr/bin/env bun

import process from 'node:process'
import { note, outro, spinner } from '@clack/prompts'
import pc from 'picocolors'
import { getAccountInfo } from './account.js'
import { getConfigPath, loadConfig, saveConfig, setupConfig } from './config.js'
import { promptForReconfiguration } from './prompts.js'

async function displayAccountInfo(mnemonic: string) {
  try {
    const s = spinner()

    s.start('Fetching account information...')
    const accountInfo = await getAccountInfo(mnemonic)
    s.stop(`Connected to ${accountInfo.balance.chainName}`)

    const accountDetails = [
      '',
      `${pc.bold('Address:')} ${pc.cyan(accountInfo.address)}`,
      `${pc.bold('Chain:')} ${pc.blue(accountInfo.balance.chainName)}`,
      '',
      `${pc.bold('Balance Information:')}`,
      `  ${pc.green('●')} Free: ${pc.bold(accountInfo.balance.free)}`,
      `  ${pc.yellow('●')} Reserved: ${pc.bold(accountInfo.balance.reserved)}`,
      `  ${pc.blue('●')} Frozen: ${pc.bold(accountInfo.balance.frozen)}`,
      `  ${pc.magenta('●')} Total: ${pc.bold(accountInfo.balance.total)}`,
    ].join('\n')

    note(accountDetails, 'Account Information')
  }
  catch (error) {
    console.error('Failed to fetch account information:', error)
  }
}

async function main() {
  try {
    // Check if config already exists
    const existingConfig = await loadConfig()

    if (existingConfig) {
      const shouldReconfigure = await promptForReconfiguration()

      if (!shouldReconfigure) {
        // Show account info for existing config
        await displayAccountInfo(existingConfig.mnemonic)
        outro(pc.green('Ready to mint NFTs! 🚀'))
        return
      }
    }

    // Setup new configuration
    const config = await setupConfig()
    saveConfig(config)

    // Show account information
    await displayAccountInfo(config.mnemonic)

    outro(pc.green(`Setup complete! Configuration saved to ${getConfigPath()}\nReady to mint NFTs on Paseo Asset Hub! 🚀`))
  }
  catch (error) {
    console.error('Setup failed:', error)
    process.exit(1)
  }
}

// Run CLI if executed directly
if (import.meta.main) {
  main()
}
