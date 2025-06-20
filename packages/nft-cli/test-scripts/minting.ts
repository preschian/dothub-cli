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

api.tx.Nfts.mint({
  collection: collectionId,
  item: 1,
  mint_to: MultiAddress.Id('5FduGmdAjpdiWL8d9fDDKD6kiuUicefrTe7SDEK9RC6frHPW'),
  witness_data: {
    mint_price: 0n,
    owned_item: 0,
  },
})
