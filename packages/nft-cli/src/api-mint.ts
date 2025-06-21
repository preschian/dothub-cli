import { spinner } from '@clack/prompts'
import { MultiAddress } from '@polkadot-api/descriptors'
import pc from 'picocolors'
import { Binary } from 'polkadot-api'
import { deriveAccountFromMnemonic } from './account'
import { sdk } from './polkadot'

export async function createCollection(mnemonic: string, metadataUri: string) {
  const { signer, address } = await deriveAccountFromMnemonic(mnemonic)
  const { api } = sdk('westend')
  const s = spinner()

  // create collection
  s.start('Creating collection...')
  const txCollection = api.tx.Nfts.create({
    admin: MultiAddress.Id(address),
    config: {
      settings: 0n,
      max_supply: undefined,
      mint_settings: {
        mint_type: { type: 'Issuer', value: undefined },
        price: undefined,
        start_block: undefined,
        end_block: undefined,
        default_item_settings: 0n,
      },
    },
  })

  const collection = await txCollection.signAndSubmit(signer)
  if (!collection.ok) {
    s.stop(`Failed to create collection: ${collection.dispatchError.type}`)
    throw new Error(collection.dispatchError.type)
  }

  const event = collection.events.find(e => e.type === 'Nfts')
  const collectionId = event?.value?.value?.collection as number
  s.stop(`Collection created: ${pc.cyan(collectionId)}`)

  // set collection metadata
  s.start('Setting collection metadata...')
  const txCollectionMetadata = api.tx.Nfts.set_collection_metadata({
    collection: collectionId,
    data: Binary.fromText(metadataUri),
  })

  await txCollectionMetadata.signAndSubmit(signer)
  s.stop(`Collection metadata updated: https://assethub-westend.subscan.io/nft_collection/${collectionId}`)

  return collectionId
}

export async function mintNFTs(mnemonic: string, collectionId: number, uris: string[]) {
  const { signer, address } = await deriveAccountFromMnemonic(mnemonic)
  const { api } = sdk('westend')
  const s = spinner()

  const txMints = Array.from({ length: uris.length }, (_, index) =>
    api.tx.Nfts.mint({
      collection: collectionId,
      item: index + 1,
      mint_to: MultiAddress.Id(address),
      witness_data: {
        mint_price: 0n,
        owned_item: 0,
      },
    }).decodedCall)

  const txMetadata = Array.from({ length: uris.length }, (_, index) =>
    api.tx.Nfts.set_metadata({
      collection: collectionId,
      item: index + 1,
      data: Binary.fromText(uris[index] || ''),
    }).decodedCall)

  s.start('Minting NFTs...')
  await api.tx.Utility.batch({
    calls: [...txMints, ...txMetadata],
  }).signAndSubmit(signer)

  s.stop(`Minting completed: https://assethub-westend.subscan.io/nft_collection/${collectionId}?tab=tokens`)
}
