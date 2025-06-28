import type { UserConfig } from './config'
import type { Metadata } from './upload'
import { existsSync, statSync } from 'node:fs'
import { basename } from 'node:path'
import process from 'node:process'
import { confirm, note, outro, spinner, text } from '@clack/prompts'
import pc from 'picocolors'
import { uploadImageToIPFS, uploadMetadataToIPFS } from './upload'

export interface MintingOptions {
  nftNameBase: string
  nftDescription: string
  imagePath: string
  isNumbered: boolean
  startingNumber: number
  totalCopies: number
}

export async function getOpenEditionMintingOptions(): Promise<MintingOptions> {
  note('Now let\'s configure your Open Edition NFT minting!', 'Open Edition Setup')

  const nftNameBase = await text({
    message: 'Enter base name for Open Edition NFTs (will be numbered):',
    placeholder: 'My Open Edition NFT #',
    validate: (value) => {
      if (!value)
        return 'NFT base name is required'
      if (value.length < 3)
        return 'NFT base name must be at least 3 characters'
    },
  })

  if (typeof nftNameBase !== 'string') {
    outro(pc.red('Minting setup cancelled'))
    process.exit(0)
  }

  const nftDescription = await text({
    message: 'Enter description for all Open Edition NFTs:',
    placeholder: 'A unique piece from our open edition collection...',
    validate: (value) => {
      if (!value)
        return 'NFT description is required'
      if (value.length < 10)
        return 'Description must be at least 10 characters'
    },
  })

  if (typeof nftDescription !== 'string') {
    outro(pc.red('Minting setup cancelled'))
    process.exit(0)
  }

  const isNumbered = await confirm({
    message: 'Should NFTs be numbered (e.g., "My NFT #1", "My NFT #2")?',
    initialValue: true,
  })

  if (typeof isNumbered !== 'boolean') {
    outro(pc.red('Minting setup cancelled'))
    process.exit(0)
  }

  const totalCopies = await text({
    message: 'How many copies would you like to create?',
    placeholder: '100',
    validate: (value) => {
      if (!value)
        return 'Number of copies is required'
      const num = Number.parseInt(value)
      if (Number.isNaN(num) || num < 1)
        return 'Must be a positive number'
      if (num > 10000)
        return 'Maximum 10,000 copies allowed'
    },
  })

  if (typeof totalCopies !== 'string') {
    outro(pc.red('Minting setup cancelled'))
    process.exit(0)
  }

  const imagePath = await text({
    message: 'Enter path to Open Edition NFT image:',
    placeholder: './my-open-edition.png',
    validate: (value) => {
      if (!value)
        return 'Image path is required'
      if (!existsSync(value))
        return 'Image file does not exist'
      try {
        const stat = statSync(value)
        if (!stat.isFile())
          return 'Path must be a file'
      }
      catch {
        return 'Cannot access file'
      }
      // Check if it's a valid image file
      const ext = value.toLowerCase()
      if (!ext.endsWith('.png') && !ext.endsWith('.jpg') && !ext.endsWith('.jpeg') && !ext.endsWith('.gif') && !ext.endsWith('.webp')) {
        return 'File must be a valid image (PNG, JPG, JPEG, GIF, WEBP)'
      }
    },
  })

  if (typeof imagePath !== 'string') {
    outro(pc.red('Minting setup cancelled'))
    process.exit(0)
  }

  let startingNumber = 1

  if (isNumbered) {
    const startingNumberInput = await text({
      message: 'Starting number for Open Edition NFTs:',
      placeholder: '1',
      initialValue: '1',
      validate: (value) => {
        if (!value)
          return 'Starting number is required'
        const num = Number.parseInt(value)
        if (Number.isNaN(num) || num < 1)
          return 'Must be a positive number'
      },
    })

    if (typeof startingNumberInput !== 'string') {
      outro(pc.red('Minting setup cancelled'))
      process.exit(0)
    }

    startingNumber = Number.parseInt(startingNumberInput)
  }

  return {
    nftNameBase,
    nftDescription,
    imagePath,
    isNumbered,
    startingNumber,
    totalCopies: Number.parseInt(totalCopies),
  }
}

export async function uploadImagesAndMetadata(
  collectionId: number,
  mintingOptions: MintingOptions,
  config: UserConfig,
) {
  // For Open Edition, we use the same image for all copies
  if (!existsSync(mintingOptions.imagePath)) {
    outro(pc.red('Image file does not exist'))
    return
  }

  const actualCopies = mintingOptions.totalCopies

  note(`Creating ${actualCopies} copies of Open Edition NFT using: ${basename(mintingOptions.imagePath)}`, 'Ready to Upload')

  const shouldProceed = await confirm({
    message: `Proceed with creating ${actualCopies} Open Edition NFT copies and uploading metadata to IPFS?`,
    initialValue: true,
  })

  if (!shouldProceed) {
    outro(pc.yellow('Upload cancelled'))
    return
  }

  const s = spinner()
  let successCount = 0
  let failCount = 0
  const metadataUris: string[] = []

  // Upload the single image once to IPFS
  s.start(`Uploading Open Edition NFT image: ${basename(mintingOptions.imagePath)}...`)

  let imageResult
  try {
    imageResult = await uploadImageToIPFS(mintingOptions.imagePath, config)
    s.stop(`✅ Image uploaded successfully: ${pc.cyan(imageResult.filebaseUrl)}`)
  }
  catch (error) {
    s.stop(`❌ Failed to upload image: ${error}`)
    outro(pc.red('Cannot proceed without uploading the image'))
    return
  }

  // Create metadata for each copy
  for (let i = 0; i < actualCopies; i++) {
    const tokenId = mintingOptions.startingNumber + i
    const nftName = mintingOptions.isNumbered
      ? `${mintingOptions.nftNameBase} #${tokenId}`
      : mintingOptions.nftNameBase

    s.start(`Creating metadata for Open Edition NFT ${mintingOptions.isNumbered ? `#${tokenId}` : `${i + 1}`}...`)

    try {
      // Create metadata using the same image
      const metadata: Metadata = {
        name: nftName,
        description: mintingOptions.nftDescription,
        image: imageResult.filebaseUri,
        source: 'dot-nft-cli',
      }

      // Upload metadata to IPFS
      const metadataResult = await uploadMetadataToIPFS(metadata, config)

      metadataUris.push(metadataResult.filebaseUrl)

      s.stop(`✅ Created metadata for Open Edition NFT ${mintingOptions.isNumbered ? `#${tokenId}` : `${i + 1}`}: ${pc.cyan(metadataResult.filebaseUrl)}`)
      successCount++
    }
    catch (error) {
      s.stop(`❌ Failed to create metadata for Open Edition NFT ${mintingOptions.isNumbered ? `#${tokenId}` : `${i + 1}`}: ${error}`)
      failCount++
    }
  }

  // Summary
  note([
    `🎉 Open Edition NFT creation completed!`,
    `✅ Successfully created: ${pc.green(successCount.toString())} Open Edition NFT metadata entries`,
    failCount > 0 ? `❌ Failed: ${pc.red(failCount.toString())} Open Edition NFT metadata` : '',
    `📁 Collection: ${pc.cyan(collectionId.toString())}`,
    `🖼️ Image: ${pc.cyan(basename(mintingOptions.imagePath))}`,
    `🔢 Numbering: ${mintingOptions.isNumbered ? pc.green('Enabled') : pc.yellow('Disabled')}`,
    `🗂️ Total processed: ${pc.bold((successCount + failCount).toString())}`,
  ].filter(Boolean).join('\n'), 'Creation Summary')

  return metadataUris
}
