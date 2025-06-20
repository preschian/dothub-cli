#!/usr/bin/env bun

import process from 'node:process'
import { outro } from '@clack/prompts'
import pc from 'picocolors'
import { getConfigPath, loadConfig, saveConfig, setupConfig } from './config.js'
import { promptForReconfiguration } from './prompts.js'

async function main() {
  try {
    // Check if config already exists
    const existingConfig = await loadConfig()

    if (existingConfig) {
      const shouldReconfigure = await promptForReconfiguration()

      if (!shouldReconfigure) {
        outro(pc.green('Ready to mint NFTs! 🚀'))
        return
      }
    }

    // Setup new configuration
    const config = await setupConfig()
    saveConfig(config)

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
