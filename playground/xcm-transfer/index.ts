import { getPolkadotSigner } from "polkadot-api/signer"
import { createClient } from "polkadot-api"
import { ahp } from "@polkadot-api/descriptors"
import { sr25519CreateDerive } from "@polkadot-labs/hdkd"
import { mnemonicToEntropy, entropyToMiniSecret } from "@polkadot-labs/hdkd-helpers"
import { withPolkadotSdkCompat } from "polkadot-api/polkadot-sdk-compat"
import { getWsProvider } from "polkadot-api/ws-provider/web";
import { Builder } from "@paraspell/sdk"

// signer - properly create from mnemonic using hdkd
const entropy = mnemonicToEntropy(process.env.MNEMONIC || '')
const miniSecret = entropyToMiniSecret(entropy)
const derive = sr25519CreateDerive(miniSecret)

// Create keypair (this handles the expansion properly)
const keypair = derive("")

const signer = getPolkadotSigner(
    keypair.publicKey,
    "Sr25519",
    (input) => keypair.sign(input),
)
 
// create the client 
const client = createClient(
    // Polkadot-SDK Nodes have issues, we recommend adding this enhancer
    // see Requirements page for more info
    withPolkadotSdkCompat(
      getWsProvider("wss://polkadot-asset-hub-rpc.polkadot.io")
    )
  );
 
// get the safely typed API
const api = client.getTypedApi(ahp)
const version = await api.constants.System.Version()
 
console.log('Building transaction...', version.spec_version)
// console.log(getSupportedAssets('AssetHubPolkadot', 'Ethereum'))

const builder = await Builder()
  .from('AssetHubPolkadot')
  .to('Ethereum')
  .currency({
    symbol: 'USDT',
    amount: '1000000',
  })
  .address('0x10de48283032d3961571a7604c9f2502b847051e')
const transfer = await builder.build()
 
// sign and submit the transaction while looking at the
// different events that will be emitted
console.log('Signing and submitting transaction...')

transfer.signSubmitAndWatch(signer).subscribe({
  next: (event) => {
    console.log("Tx event: ", event.type)
    if (event.type === "txBestBlocksState") {
      console.log("The tx is now in a best block, check it out:")
      console.log(`https://assethub-polkadot.subscan.io/extrinsic/${event.txHash}`)
    }
  },
  error: console.error,
  complete() {
    client.destroy()
    builder.disconnect()
    process.exit(0)
  },
})