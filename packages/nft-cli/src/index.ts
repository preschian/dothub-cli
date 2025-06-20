#!/usr/bin/env node

import process from 'node:process'
import { intro, outro, select } from '@clack/prompts'
import pc from 'picocolors'
import { displayAccountInfo } from './account.js'
import { getConfigPath, loadConfig, saveConfig, setupConfig } from './config.js'
import { runMintingWorkflow } from './mint.js'

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
  intro(pc.bgBlue(' Dot NFT CLI 🎨 '))
  main()
}
