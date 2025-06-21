import type { UserConfig } from './config.js'
import { Buffer } from 'node:buffer'
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { basename, extname, join } from 'node:path'
import { ObjectManager } from '@filebase/sdk'

export interface UploadResult {
  ipfsHash: string
  filebaseUrl: string
  filebaseUri: string
  fileName: string
}

export interface Metadata {
  name: string
  description: string
  image: string
  source: string
}

export async function uploadImageToIPFS(
  imagePath: string,
  config: UserConfig,
): Promise<UploadResult> {
  const objectManager = new ObjectManager(config.filebaseKey, config.filebaseSecret, {
    bucket: config.filebaseBucket,
  })

  const fileName = `${basename(imagePath)}-${Date.now()}`
  const fileContent = readFileSync(imagePath)

  // Upload file using ObjectManager with proper parameters
  const uploadedObject = await objectManager.upload(
    `images/${fileName}`,
    fileContent,
    { application: 'dot-nft-cli' },
    {},
  )

  // Handle potential undefined cid
  const cid = uploadedObject.cid || 'unknown'

  return {
    ipfsHash: cid,
    filebaseUrl: `https://nftstorage.link/ipfs/${cid}`,
    filebaseUri: `ipfs://${cid}`,
    fileName,
  }
}

export async function uploadMetadataToIPFS(
  metadata: Metadata,
  config: UserConfig,
): Promise<UploadResult> {
  const objectManager = new ObjectManager(config.filebaseKey, config.filebaseSecret, {
    bucket: config.filebaseBucket,
  })

  const fileName = `metadata-${metadata.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}.json`
  const metadataJson = JSON.stringify(metadata, null, 2)

  // Upload metadata JSON using ObjectManager with proper parameters
  const uploadedObject = await objectManager.upload(
    `metadata/${fileName}`,
    Buffer.from(metadataJson, 'utf-8'),
    { application: 'dot-nft-cli', type: 'metadata' },
    {},
  )

  // Handle potential undefined cid
  const cid = uploadedObject.cid || 'unknown'

  return {
    ipfsHash: cid,
    filebaseUrl: `https://nftstorage.link/ipfs/${cid}`,
    filebaseUri: `ipfs://${cid}`,
    fileName,
  }
}

export function getImagesFromFolder(folderPath: string): string[] {
  try {
    const files = readdirSync(folderPath)
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']

    return files
      .filter((file) => {
        const ext = extname(file).toLowerCase()
        return imageExtensions.includes(ext)
      })
      .map(file => join(folderPath, file))
      .filter((filePath) => {
        try {
          return statSync(filePath).isFile()
        }
        catch {
          return false
        }
      })
      .sort()
  }
  catch (error) {
    console.error('Error reading folder:', error)
    return []
  }
}
