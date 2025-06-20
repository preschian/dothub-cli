import { paseo_asset_hub } from '@polkadot-api/descriptors'
import { createClient } from 'polkadot-api'
import { withPolkadotSdkCompat } from 'polkadot-api/polkadot-sdk-compat'
import { getWsProvider } from 'polkadot-api/ws-provider/web'

const client_paseo_asset_hub = createClient(
  withPolkadotSdkCompat(
    getWsProvider('wss://sys.turboflakes.io/asset-hub-paseo'),
  ),
)

const api_paseo_asset_hub = client_paseo_asset_hub.getTypedApi(paseo_asset_hub)

export {
  api_paseo_asset_hub,
  client_paseo_asset_hub,
}
