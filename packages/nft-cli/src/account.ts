import { note } from '@clack/prompts'
import { sr25519CreateDerive } from '@polkadot-labs/hdkd'
import { entropyToMiniSecret } from '@polkadot-labs/hdkd-helpers'
import { Keyring } from '@polkadot/keyring'
import { cryptoWaitReady, mnemonicToEntropy } from '@polkadot/util-crypto'
import pc from 'picocolors'
import { getPolkadotSigner } from 'polkadot-api/signer'
import { sdk } from './polkadot.js'

export async function deriveAccountFromMnemonic(mnemonic: string) {
  await cryptoWaitReady()

  // Create keyring for substrate accounts
  const keyring = new Keyring({ type: 'sr25519', ss58Format: 0 })
  const pair = keyring.addFromMnemonic(mnemonic)

  // signer - properly create from mnemonic using hdkd
  const entropy = mnemonicToEntropy(mnemonic)
  const miniSecret = entropyToMiniSecret(entropy)
  const derive = sr25519CreateDerive(miniSecret)
  const keypair = derive('')
  const signer = getPolkadotSigner(
    keypair.publicKey,
    'Sr25519',
    input => keypair.sign(input),
  )

  return {
    address: pair.address,
    signer,
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
    const accountInfo = await sdk('westend').api.query.System.Account.getValue(address)
    const chainSpec = await sdk('westend').client.getChainSpecData()
    const chainSymbol = chainSpec.properties.tokenSymbol as string
    const chainDecimals = chainSpec.properties.tokenDecimals as number
    const chainName = chainSpec.name

    if (!accountInfo) {
      return emptyState
    }

    // Convert from planck (smallest unit)
    const free = `${formatBalance(accountInfo.data.free, chainDecimals)} ${chainSymbol}`
    const reserved = `${formatBalance(accountInfo.data.reserved, chainDecimals)} ${chainSymbol}`
    const frozen = `${formatBalance(accountInfo.data.frozen, chainDecimals)} ${chainSymbol}`
    const total = `${formatBalance(accountInfo.data.free + accountInfo.data.reserved, chainDecimals)} ${chainSymbol}`

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

export async function displayAccountInfo(mnemonic: string) {
  try {
    note('Fetching account information...', 'Account Details')

    const account = await deriveAccountFromMnemonic(mnemonic)
    const balance = await getAccountBalance(account.address)

    const accountDetails = [
      `${pc.bold('Address:')} ${pc.cyan(account.address)}`,
      `${pc.bold('Chain:')} ${pc.blue(balance.chainName)}`,
      '',
      `${pc.bold('Balance Information:')}`,
      `  ${pc.green('●')} Free: ${pc.bold(balance.free)} DOT`,
      `  ${pc.yellow('●')} Reserved: ${pc.bold(balance.reserved)} DOT`,
      `  ${pc.blue('●')} Frozen: ${pc.bold(balance.frozen)} DOT`,
      `  ${pc.magenta('●')} Total: ${pc.bold(balance.total)} DOT`,
    ].join('\n')

    note(accountDetails, 'Account Information')
  }
  catch (error) {
    note(`Failed to fetch account information: ${error}`, 'Error')
  }
}

function formatBalance(balance: bigint, decimals = 10) {
  const divisor = BigInt(10 ** decimals)

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
