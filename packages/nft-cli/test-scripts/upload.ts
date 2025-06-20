import { createReadStream, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import process from 'node:process'
import { ObjectManager } from '@filebase/sdk'

const objectManager = new ObjectManager(process.env.S3_KEY, process.env.S3_SECRET, {
  bucket: process.env.S3_BUCKET,
})

async function uploadFolder() {
  const folderPath = './example-images'

  try {
    const items = readdirSync(folderPath)
    const filesArray = items
      .map(item => join(folderPath, item))
      .filter(filePath => statSync(filePath).isFile())
      .map(file => ({
        path: file,
        content: createReadStream(file),
      }))

    const uploadedFolder = await objectManager.upload(`file-${new Date().toISOString()}`, filesArray, undefined, {})

    // eslint-disable-next-line no-console
    console.log('Uploaded folder:', `https://nftstorage.link/ipfs/${uploadedFolder.cid}`)
  }
  catch (error) {
    console.error('Error uploading folder:', error)
  }
}

uploadFolder()
