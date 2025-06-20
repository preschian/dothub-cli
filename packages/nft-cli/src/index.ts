#!/usr/bin/env bun

import process from 'node:process'
import { note, outro, select } from '@clack/prompts'
import pc from 'picocolors'
import { getAccountInfo } from './account.js'
import { getConfigPath, loadConfig, saveConfig, setupConfig } from './config.js'
import { runMintingWorkflow } from './mint.js'
import { promptForReconfiguration } from './prompts.js'

async function displayAccountInfo(mnemonic: string) {
  try {
    note('Fetching account information...', 'Account Details')

    const accountInfo = await getAccountInfo(mnemonic)

    const accountDetails = [
      `${pc.bold('Address:')} ${pc.cyan(accountInfo.address)}`,
      `${pc.bold('Chain:')} ${pc.blue(accountInfo.balance.chainName)}`,
      '',
      `${pc.bold('Balance Information:')}`,
      `  ${pc.green('●')} Free: ${pc.bold(accountInfo.balance.free)} DOT`,
      `  ${pc.yellow('●')} Reserved: ${pc.bold(accountInfo.balance.reserved)} DOT`,
      `  ${pc.blue('●')} Frozen: ${pc.bold(accountInfo.balance.frozen)} DOT`,
      `  ${pc.magenta('●')} Total: ${pc.bold(accountInfo.balance.total)} DOT`,
    ].join('\n')

    note(accountDetails, 'Account Information')
  }
  catch (error) {
    note(`Failed to fetch account information: ${error}`, 'Error')
  }
}

async function showMainMenu() {
  const action = await select({
    message: 'What would you like to do?',
    options: [
      { value: 'mint', label: '🎨 Create NFT Collection & Mint NFTs', hint: 'Upload images and create NFT collection' },
      { value: 'account', label: '👤 View Account Information', hint: 'Show wallet address and balance' },
      { value: 'config', label: '⚙️  Reconfigure Settings', hint: 'Update credentials and configuration' },
      { value: 'exit', label: '🚪 Exit', hint: 'Close the application' },
    ],
  })

  return action
}

async function main() {
  try {
    // Check if config already exists
    const existingConfig = await loadConfig()

    if (existingConfig) {
      const shouldReconfigure = await promptForReconfiguration()

      if (shouldReconfigure) {
        // Setup new configuration
        const config = await setupConfig()
        saveConfig(config)
        outro(pc.green(`Configuration updated! Saved to ${getConfigPath()}`))
      }

      // Show account info
      await displayAccountInfo(existingConfig.mnemonic)

      // Main menu loop
      while (true) {
        const action = await showMainMenu()

        switch (action) {
          case 'mint':
            await runMintingWorkflow(existingConfig)
            break
          case 'account':
            await displayAccountInfo(existingConfig.mnemonic)
            break
          case 'config': {
            const newConfig = await setupConfig()
            saveConfig(newConfig)
            outro(pc.green(`Configuration updated! Saved to ${getConfigPath()}`))
            break
          }
          case 'exit':
            outro(pc.green('Goodbye! 👋'))
            process.exit(0)
            break
          default:
            outro(pc.red('Unknown action'))
            process.exit(1)
        }
      }
    }
    else {
      // Setup new configuration
      const config = await setupConfig()
      saveConfig(config)

      outro(pc.green(`Setup complete! Configuration saved to ${getConfigPath()}\nReady to mint NFTs on Paseo Asset Hub! 🚀`))

      // Show account info for new setup
      await displayAccountInfo(config.mnemonic)

      // Start main menu
      await main()
    }
  }
  catch (error) {
    outro(pc.red(`Error: ${error}`))
    process.exit(1)
  }
}

if (import.meta.main) {
  main()
}
