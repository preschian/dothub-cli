import type { UserConfig } from './config.js'
import type { Metadata } from './upload.js'
import { existsSync, statSync } from 'node:fs'
import { basename } from 'node:path'
import process from 'node:process'
import { confirm, note, outro, spinner, text } from '@clack/prompts'
import pc from 'picocolors'
import { createCollection } from './api-mint.js'
import { getImagesFromFolder, uploadImageToIPFS, uploadMetadataToIPFS } from './upload.js'

export interface CollectionInfo {
  name: string
  description: string
  collectionImagePath: string
}

export interface MintingOptions {
  nftNameBase: string
  nftDescription: string
  imagesFolderPath: string
  startingNumber: number
}

export async function createCollectionPrompt(): Promise<CollectionInfo> {
  note('Let\'s create your NFT collection!', 'Collection Setup')

  const name = await text({
    message: 'Enter collection name:',
    placeholder: 'My Awesome NFT Collection',
    validate: (value) => {
      if (!value)
        return 'Collection name is required'
    },
  })

  if (typeof name !== 'string') {
    outro(pc.red('Collection creation cancelled'))
    process.exit(0)
  }

  const description = await text({
    message: 'Enter collection description:',
    placeholder: 'A unique collection of digital artworks...',
    validate: (value) => {
      if (!value)
        return 'Collection description is required'
    },
  })

  if (typeof description !== 'string') {
    outro(pc.red('Collection creation cancelled'))
    process.exit(0)
  }

  const collectionImagePath = await text({
    message: 'Enter collection image path:',
    placeholder: '/Users/dot-nft/collection.png',
    validate: (value) => {
      if (!value)
        return 'Collection image path is required'
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
    },
  })

  if (typeof collectionImagePath !== 'string') {
    outro(pc.red('Collection creation cancelled'))
    process.exit(0)
  }

  return {
    name,
    description,
    collectionImagePath,
  }
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

export async function uploadCollectionMetadata(
  collectionInfo: CollectionInfo,
  config: UserConfig,
) {
  const s = spinner()

  try {
    s.start('Uploading collection image to IPFS...')
    const image = await uploadImageToIPFS(collectionInfo.collectionImagePath, config)
    s.stop(`Collection image uploaded: ${pc.cyan(image.filebaseUrl)}`)

    const metadata: Metadata = {
      name: collectionInfo.name,
      description: collectionInfo.description,
      image: image.filebaseUri,
      source: 'dot-nft-cli',
    }

    s.start('Uploading collection metadata to IPFS...')
    const metadataResult = await uploadMetadataToIPFS(metadata, config)
    s.stop(`Collection metadata uploaded: ${pc.cyan(metadataResult.filebaseUrl)}`)

    return metadataResult.filebaseUri
  }
  catch (error) {
    s.stop(`Failed to upload collection metadata: ${error}`)
    throw error
  }
}

export async function mintNFTs(
  collectionInfo: CollectionInfo,
  mintingOptions: MintingOptions,
  config: UserConfig,
): Promise<void> {
  const images = getImagesFromFolder(mintingOptions.imagesFolderPath)

  if (images.length === 0) {
    outro(pc.red('No images found in the specified folder'))
    return
  }

  note(`Found ${images.length} images to mint`, 'Ready to Mint')

  const shouldProceed = await confirm({
    message: `Proceed with minting ${images.length} NFTs?`,
    initialValue: true,
  })

  if (!shouldProceed) {
    outro(pc.yellow('Minting cancelled'))
    return
  }

  const s = spinner()
  let successCount = 0
  let failCount = 0

  for (let i = 0; i < images.length; i++) {
    const imagePath = images[i]
    const tokenId = mintingOptions.startingNumber + i
    const nftName = `${mintingOptions.nftNameBase}${tokenId}`

    s.start(`Minting NFT ${tokenId}: ${basename(imagePath)}...`)

    try {
      // Upload image to IPFS
      const imageResult = await uploadImageToIPFS(imagePath, config)

      // Create metadata
      const metadata: NFTMetadata = {
        name: nftName,
        description: mintingOptions.nftDescription,
        image: `ipfs://${imageResult.ipfsHash}`,
        attributes: [
          {
            trait_type: 'Collection',
            value: collectionInfo.name,
          },
          {
            trait_type: 'Token ID',
            value: tokenId,
          },
        ],
      }

      // Upload metadata to IPFS
      await uploadMetadataToIPFS(metadata, tokenId, config)

      s.stop(`✅ NFT ${tokenId} minted successfully`)
      successCount++
    }
    catch (error) {
      s.stop(`❌ Failed to mint NFT ${tokenId}: ${error}`)
      failCount++
    }
  }

  // Summary
  note([
    `🎉 Minting completed!`,
    `✅ Successfully minted: ${pc.green(successCount.toString())} NFTs`,
    failCount > 0 ? `❌ Failed: ${pc.red(failCount.toString())} NFTs` : '',
    `📁 Collection: ${pc.cyan(collectionInfo.name)}`,
    `🗂️  Total NFTs: ${pc.bold((successCount + failCount).toString())}`,
  ].filter(Boolean).join('\n'), 'Minting Summary')
}

export async function runMintingWorkflow(config: UserConfig): Promise<void> {
  try {
    // Step 1: Prompt for collection
    const collectionInfo = await createCollectionPrompt()

    // Step 2: Upload collection metadata
    const collectionMetadataUri = await uploadCollectionMetadata(collectionInfo, config)

    // Step 3: Create collection
    const collectionId = await createCollection(config.mnemonic, collectionMetadataUri)
    console.log(collectionId)

    // Step 3: Get minting options
    // const mintingOptions = await getMintingOptionsPrompt()

    // Step 4: Mint NFTs
    // await mintNFTs(collectionInfo, mintingOptions, config)

    outro(pc.green('NFT collection minting completed! 🚀'))
  }
  catch (error) {
    outro(pc.red(`Minting failed: ${error}`))
    process.exit(1)
  }
}
