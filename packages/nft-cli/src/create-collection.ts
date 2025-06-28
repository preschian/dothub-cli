import type { UserConfig } from './config.js'
import type { Metadata } from './upload.js'
import { existsSync, statSync } from 'node:fs'
import process from 'node:process'
import { note, outro, spinner, text } from '@clack/prompts'
import pc from 'picocolors'
import { createCollection, mintNFTs } from './api-mint.js'
import { getMintingOptionsPrompt, uploadImagesAndMetadata } from './create-nft.js'
import { collectNFTTypeSelection } from './prompts.js'
import { uploadImageToIPFS, uploadMetadataToIPFS } from './upload.js'

export interface CollectionInfo {
  name: string
  description: string
  collectionImagePath: string
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

export async function runMintingWorkflow(config: UserConfig): Promise<void> {
  try {
    // Step 1: Select NFT type
    note('Let\'s start by choosing your NFT type!', 'NFT Type Selection')
    const _nftType = await collectNFTTypeSelection()

    // Continue with Open Edition NFT workflow
    note(`Creating ${pc.cyan('Open Edition NFT')} collection...`, 'Collection Setup')

    // Step 2: Prompt for collection
    const collectionInfo = await createCollectionPrompt()

    // Step 3: Upload collection metadata
    const collectionMetadataUri = await uploadCollectionMetadata(collectionInfo, config)

    // Step 4: Create collection
    const collectionId = await createCollection(config.mnemonic, collectionMetadataUri, config.chain)

    // Step 5: Get minting options
    const mintingOptions = await getMintingOptionsPrompt()

    // Step 6: Upload images and metadata to IPFS
    const uris = await uploadImagesAndMetadata(collectionId, mintingOptions, config)

    if (!uris) {
      outro(pc.red('No NFTs to mint'))
      process.exit(0)
    }

    // Step 7: Mint NFTs
    await mintNFTs(config.mnemonic, collectionId, uris, config.chain)

    outro(pc.green('Open Edition NFT collection minting completed! 🚀'))
  }
  catch (error) {
    outro(pc.red(`Minting failed: ${error}`))
    process.exit(1)
  }
}
