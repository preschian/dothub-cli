import type { Chain } from './config.js'
import { createClient } from 'polkadot-api'
import { withPolkadotSdkCompat } from 'polkadot-api/polkadot-sdk-compat'
import { getWsProvider } from 'polkadot-api/ws-provider/web'
import { paseo_asset_hub, westend_asset_hub } from './descriptors/dist/index'

const client_paseo_asset_hub = createClient(
  withPolkadotSdkCompat(
    getWsProvider('wss://sys.turboflakes.io/asset-hub-paseo'),
  ),
)

const client_westend_asset_hub = createClient(
  withPolkadotSdkCompat(
    getWsProvider('wss://asset-hub-westend-rpc.n.dwellir.com'),
  ),
)

const api_paseo_asset_hub = client_paseo_asset_hub.getTypedApi(paseo_asset_hub)
const api_westend_asset_hub = client_westend_asset_hub.getTypedApi(westend_asset_hub)

function sdk(chain: Chain) {
  if (chain === 'paseo') {
    return {
      api: api_paseo_asset_hub,
      client: client_paseo_asset_hub,
    }
  }

  return {
    api: api_westend_asset_hub,
    client: client_westend_asset_hub,
  }
}

export {
  sdk,
}
