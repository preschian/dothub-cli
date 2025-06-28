import type { Chain } from './config.js'
import process from 'node:process'
import { cancel, confirm, isCancel, outro, password, select, text } from '@clack/prompts'
import pc from 'picocolors'

export async function collectMnemonic(): Promise<string> {
  const mnemonic = await password({
    message: 'Enter your Polkadot mnemonic seed phrase:',
    validate: (value) => {
      if (!value)
        return 'Mnemonic seed is required'
      const words = value.trim().split(' ')
      if (words.length !== 12 && words.length !== 24)
        return 'Mnemonic must be either 12 or 24 words'
    },
  })

  if (isCancel(mnemonic)) {
    cancel('Setup cancelled.')
    process.exit(0)
  }

  return mnemonic as string
}

export async function collectFilebaseCredentials(): Promise<{
  key: string
  secret: string
  bucket: string
}> {
  const filebaseKey = await text({
    message: 'Enter your Filebase S3 access key:',
    placeholder: 'Your Filebase access key',
    validate: (value) => {
      if (!value)
        return 'Filebase access key is required'
    },
  })

  if (isCancel(filebaseKey)) {
    cancel('Setup cancelled.')
    process.exit(0)
  }

  const filebaseSecret = await password({
    message: 'Enter your Filebase S3 secret key:',
    validate: (value) => {
      if (!value)
        return 'Filebase secret key is required'
    },
  })

  if (isCancel(filebaseSecret)) {
    cancel('Setup cancelled.')
    process.exit(0)
  }

  const filebaseBucket = await text({
    message: 'Enter your Filebase S3 bucket name:',
    placeholder: 'my-nft-bucket',
    validate: (value) => {
      if (!value)
        return 'Filebase bucket name is required'
      // Basic S3 bucket name validation
      if (!/^[a-z0-9.-]+$/.test(value)) {
        return 'Bucket name must contain only lowercase letters, numbers, dots, and hyphens'
      }
    },
  })

  if (isCancel(filebaseBucket)) {
    cancel('Setup cancelled.')
    process.exit(0)
  }

  return {
    key: filebaseKey as string,
    secret: filebaseSecret as string,
    bucket: filebaseBucket as string,
  }
}

export async function collectChainSelection(): Promise<Chain> {
  const chain = await select({
    message: 'Select the blockchain network:',
    options: [
      {
        value: 'paseo' as const,
        label: 'Paseo Asset Hub',
        hint: 'Polkadot testnet - recommended for testing',
      },
      {
        value: 'westend' as const,
        label: 'Westend Asset Hub',
        hint: 'Alternative testnet - more stable',
      },
    ],
  })

  if (isCancel(chain)) {
    cancel('Setup cancelled.')
    process.exit(0)
  }

  return chain as Chain
}

export async function promptForReconfiguration(): Promise<boolean> {
  const shouldReconfigure = await confirm({
    message: 'Configuration exists. Would you like to reconfigure?',
    initialValue: false,
  })

  if (isCancel(shouldReconfigure)) {
    outro(pc.green('Ready to mint NFTs! 🚀'))
    process.exit(0)
  }

  return shouldReconfigure as boolean
}

export type NFTType = 'open-edition' | 'more-coming-soon'

export async function collectNFTTypeSelection(): Promise<NFTType> {
  const nftType = await select({
    message: 'Select NFT type:',
    options: [
      {
        value: 'open-edition' as const,
        label: '🎨 Open Edition NFT',
        hint: 'Unlimited minting - perfect for digital art collections',
      },
      {
        value: 'more-coming-soon' as const,
        label: '✨ More... (coming soon)',
        hint: 'Limited Edition & other NFT types',
      },
    ],
  })

  if (isCancel(nftType)) {
    cancel('NFT creation cancelled.')
    process.exit(0)
  }

  // Handle coming soon option
  if (nftType === 'more-coming-soon') {
    outro(pc.yellow(`More NFT types are coming soon! 🚀

Upcoming features:
• 💎 Limited Edition NFTs
• 🎯 And more...

Currently only Open Edition NFTs are supported.`))
    process.exit(0)
  }

  return nftType as NFTType
}
