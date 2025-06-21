import type { UserConfig } from './config'
import type { Metadata } from './upload'
import { existsSync, statSync } from 'node:fs'
import { basename } from 'node:path'
import process from 'node:process'
import { confirm, note, outro, spinner, text } from '@clack/prompts'
import pc from 'picocolors'
import { getImagesFromFolder, uploadImageToIPFS, uploadMetadataToIPFS } from './upload'

export interface MintingOptions {
  nftNameBase: string
  nftDescription: string
  imagesFolderPath: string
  startingNumber: number
}

export async function getMintingOptionsPrompt(): Promise<MintingOptions> {
  note('Now let\'s configure your NFT minting!', 'Minting Setup')

  const nftNameBase = await text({
    message: 'Enter base name for NFTs (will be numbered):',
    placeholder: 'My NFT #',
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
    message: 'Enter description for all NFTs:',
    placeholder: 'A unique piece from our exclusive collection...',
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

  const imagesFolderPath = await text({
    message: 'Enter folder path containing NFT images:',
    placeholder: './nft-images/',
    validate: (value) => {
      if (!value)
        return 'Images folder path is required'
      if (!existsSync(value))
        return 'Folder does not exist'
      try {
        const stat = statSync(value)
        if (!stat.isDirectory())
          return 'Path must be a directory'
      }
      catch {
        return 'Cannot access folder'
      }
      const images = getImagesFromFolder(value)
      if (images.length === 0)
        return 'Folder contains no valid image files'
    },
  })

  if (typeof imagesFolderPath !== 'string') {
    outro(pc.red('Minting setup cancelled'))
    process.exit(0)
  }

  const startingNumber = await text({
    message: 'Starting number for NFTs:',
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

  if (typeof startingNumber !== 'string') {
    outro(pc.red('Minting setup cancelled'))
    process.exit(0)
  }

  return {
    nftNameBase,
    nftDescription,
    imagesFolderPath,
    startingNumber: Number.parseInt(startingNumber),
  }
}

export async function uploadImagesAndMetadata(
  collectionId: number,
  mintingOptions: MintingOptions,
  config: UserConfig,
) {
  const images = getImagesFromFolder(mintingOptions.imagesFolderPath)

  if (images.length === 0) {
    outro(pc.red('No images found in the specified folder'))
    return
  }

  note(`Found ${images.length} images to upload`, 'Ready to Upload')

  const shouldProceed = await confirm({
    message: `Proceed with uploading ${images.length} NFT images and metadata to IPFS?`,
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

  for (let i = 0; i < images.length; i++) {
    const imagePath = images[i]
    const tokenId = mintingOptions.startingNumber + i
    const nftName = `${mintingOptions.nftNameBase} #${tokenId}`

    if (!imagePath) {
      s.stop(`❌ Failed to mint NFT ${tokenId}: Image path is undefined`)
      failCount++
      continue
    }

    s.start(`Uploading NFT ${tokenId}: ${basename(imagePath)}...`)

    try {
      // Upload image to IPFS
      const imageResult = await uploadImageToIPFS(imagePath, config)

      // Create metadata
      const metadata: Metadata = {
        name: nftName,
        description: mintingOptions.nftDescription,
        image: imageResult.filebaseUri,
        source: 'dot-nft-cli',
      }

      // Upload metadata to IPFS
      const metadataResult = await uploadMetadataToIPFS(metadata, config)

      metadataUris.push(metadataResult.filebaseUrl)

      s.stop(`✅ Uploaded NFT ${tokenId} metadata successfully: ${pc.cyan(metadataResult.filebaseUrl)}`)
      successCount++
    }
    catch (error) {
      s.stop(`❌ Failed to upload NFT ${tokenId} metadata: ${error}`)
      failCount++
    }
  }

  // Summary
  note([
    `🎉 Upload completed!`,
    `✅ Successfully uploaded: ${pc.green(successCount.toString())} NFT images and metadata`,
    failCount > 0 ? `❌ Failed: ${pc.red(failCount.toString())} NFT uploads` : '',
    `📁 Collection: ${pc.cyan(collectionId.toString())}`,
    `🗂️ Total processed: ${pc.bold((successCount + failCount).toString())}`,
  ].filter(Boolean).join('\n'), 'Upload Summary')

  return metadataUris
}
