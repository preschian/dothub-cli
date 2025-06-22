#!/usr/bin/env node

import type { UserConfig } from './config.js'
import process from 'node:process'
import { intro, outro, select } from '@clack/prompts'
import pc from 'picocolors'
import { displayAccountInfo } from './account.js'
import { getConfigPath, loadConfig, saveConfig, setupConfig } from './config.js'
import { runMintingWorkflow } from './create-collection.js'
import { collectChainSelection } from './prompts.js'

async function showMainMenu(currentChain: string) {
  const chainDisplay = currentChain === 'paseo' ? 'Paseo' : 'Westend'

  const action = await select({
    message: 'What would you like to do?',
    options: [
      {
        value: 'mint',
        label: '🎨 Create NFT Collection & Mint NFTs',
        hint: 'Upload images and create NFT collection',
      },
      {
        value: 'account',
        label: '👤 View Account Information',
        hint: 'Show wallet address and balance',
      },
      {
        value: 'switch-network',
        label: `🔄 Switch Network (Current: ${chainDisplay})`,
        hint: 'Change between Paseo and Westend',
      },
      {
        value: 'config',
        label: '⚙️ Reconfigure Settings',
        hint: 'Update credentials and configuration',
      },
      {
        value: 'exit',
        label: '🚪 Exit',
        hint: 'Close the application',
      },
    ],
  })

  return action
}

async function switchNetwork(currentConfig: UserConfig): Promise<UserConfig> {
  const newChain = await collectChainSelection()

  if (newChain === currentConfig.chain) {
    outro(pc.yellow(`Already using ${newChain === 'paseo' ? 'Paseo' : 'Westend'} network`))
    return currentConfig
  }

  const updatedConfig: UserConfig = {
    ...currentConfig,
    chain: newChain,
  }

  saveConfig(updatedConfig)
  const chainName = newChain === 'paseo' ? 'Paseo' : 'Westend'
  outro(pc.green(`Network switched to ${chainName} Asset Hub! 🔄`))

  return updatedConfig
}

async function main() {
  try {
    // Check if config already exists
    let existingConfig = await loadConfig()

    if (existingConfig) {
      // Show account info
      await displayAccountInfo(existingConfig.mnemonic, existingConfig.chain)

      // Main menu loop
      while (true) {
        const action = await showMainMenu(existingConfig.chain)

        switch (action) {
          case 'mint':
            await runMintingWorkflow(existingConfig)
            break
          case 'account':
            await displayAccountInfo(existingConfig.mnemonic, existingConfig.chain)
            break
          case 'switch-network':
            existingConfig = await switchNetwork(existingConfig)
            break
          case 'config': {
            const newConfig = await setupConfig()
            saveConfig(newConfig)
            existingConfig = newConfig
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

      const chainName = config.chain === 'paseo' ? 'Paseo' : 'Westend'
      outro(pc.green(`Setup complete! Configuration saved to ${getConfigPath()}\nReady to mint NFTs on ${chainName} Asset Hub! 🚀`))

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
