/* eslint-disable unused-imports/no-unused-vars */
/* eslint-disable no-console */
/* eslint-disable antfu/no-top-level-await */
import { readFile } from 'node:fs/promises'
import process from 'node:process'
import { MultiAddress } from '@polkadot-api/descriptors'
import { Binary } from 'polkadot-api'
import { deriveAccountFromMnemonic } from '../src/account'
import { sdk } from '../src/polkadot'

const { signer } = await deriveAccountFromMnemonic(process.env.MNEMONIC || '')
const { api } = sdk('westend')
const owner = '5FduGmdAjpdiWL8d9fDDKD6kiuUicefrTe7SDEK9RC6frHPW'

async function createCollection() {
  const txCollection = api.tx.Nfts.create({
    admin: MultiAddress.Id('5FduGmdAjpdiWL8d9fDDKD6kiuUicefrTe7SDEK9RC6frHPW'),
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
  const event = collection.events.find(e => e.type === 'Nfts')
  const collectionId = event?.value?.value?.collection

  const file = await readFile('./example/collection-metadata.json')

  const txCollectionMetadata = api.tx.Nfts.set_collection_metadata({
    collection: collectionId,
    data: Binary.fromBytes(new Uint8Array(file)),
  })

  txCollectionMetadata.signSubmitAndWatch(signer).subscribe({
    next: (event) => {
      console.log('event', event.type)
    },
    complete: async () => {
      process.exit(0)
    },
  })
}

async function mintNFTs() {
  const collectionId = 202
  const total = 5

  const queryNfts = await api.query.Nfts.Item.getEntries(collectionId)
  const existingNfts = queryNfts.length

  const txMints = Array.from({ length: total }, (_, index) =>
    api.tx.Nfts.mint({
      collection: collectionId,
      item: index + 1 + existingNfts,
      mint_to: MultiAddress.Id(owner),
      witness_data: {
        mint_price: 0n,
        owned_item: 0,
      },
    }).decodedCall)

  const txMetadata = Array.from({ length: total }, (_, index) =>
    api.tx.Nfts.set_metadata({
      collection: collectionId,
      item: index + 1 + existingNfts,
      data: Binary.fromText('test'),
    }).decodedCall)

  if (!txMints.length) {
    console.log('No NFTs to mint')
    process.exit(0)
  }

  console.log('starting batch')
  await api.tx.Utility.batch({
    calls: [...txMints, ...txMetadata],
  }).signAndSubmit(signer, { at: 'best' })

  console.log(`https://assethub-westend.subscan.io/nft_collection/${collectionId}?tab=tokens`)
  process.exit(0)
}

mintNFTs()
