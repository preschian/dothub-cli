import { Keyring } from '@polkadot/keyring'
import { cryptoWaitReady } from '@polkadot/util-crypto'
import { api_paseo_asset_hub, client_paseo_asset_hub } from './polkadot.js'

export async function deriveAccountFromMnemonic(mnemonic: string): Promise<{
  address: string
}> {
  // Wait for crypto to be ready
  await cryptoWaitReady()

  // Create keyring for substrate accounts
  const keyring = new Keyring({ type: 'sr25519', ss58Format: 0 })

  // Create account from mnemonic
  const pair = keyring.addFromMnemonic(mnemonic)

  return {
    address: pair.address,
  }
}

export async function getAccountBalance(address: string) {
  const emptyState = {
    free: '0',
    reserved: '0',
    frozen: '0',
    total: '0',
    chainName: 'Unknown',
    chainSymbol: 'Unknown',
  }

  try {
    // Get account info from the chain
    const accountInfo = await api_paseo_asset_hub.query.System.Account.getValue(address)
    const chainSpec = await client_paseo_asset_hub.getChainSpecData()
    const chainSymbol = chainSpec.properties.tokenSymbol as string
    const chainName = chainSpec.name

    if (!accountInfo) {
      return emptyState
    }

    // Convert from planck (smallest unit) to DOT
    const free = `${formatBalance(accountInfo.data.free)} ${chainSymbol}`
    const reserved = `${formatBalance(accountInfo.data.reserved)} ${chainSymbol}`
    const frozen = `${formatBalance(accountInfo.data.frozen)} ${chainSymbol}`
    const total = `${formatBalance(accountInfo.data.free + accountInfo.data.reserved)} ${chainSymbol}`

    return {
      free,
      reserved,
      frozen,
      total,
      chainName,
      chainSymbol,
    }
  }
  catch (error) {
    console.error('Failed to fetch balance:', error)
    return emptyState
  }
}

export async function getAccountInfo(mnemonic: string) {
  const account = await deriveAccountFromMnemonic(mnemonic)
  const balance = await getAccountBalance(account.address)

  return {
    address: account.address,
    balance,
  }
}

function formatBalance(balance: bigint): string {
  // Paseo Asset Hub uses 10 decimal places (like DOT)
  const decimals = 10n
  const divisor = 10n ** decimals

  const whole = balance / divisor
  const remainder = balance % divisor

  if (remainder === 0n) {
    return whole.toString()
  }

  // Format with decimal places, removing trailing zeros
  const remainderStr = remainder.toString().padStart(Number(decimals), '0')
  const trimmed = remainderStr.replace(/0+$/, '')

  return trimmed.length > 0 ? `${whole}.${trimmed}` : whole.toString()
}
