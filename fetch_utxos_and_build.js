/**
 * fetch_utxos_and_build.js
 * ------------------------
 * Purpose: Query the Blockstream API for UTXOs of a given address, then format them into the
 * JSON body your /build_transfer route expects.
 *
 * Usage:
 *   node fetch_utxos_and_build.js <NETWORK> <WIF> <FROM_ADDRESS> <AMOUNT_BTC> <FEE_RATE_SAT_VB>
 *   Example:
 *     node fetch_utxos_and_build.js testnet <WIF> tb1q... 0.00009 5
 *
 * Behavior:
 * - Derives the P2WPKH address from the WIF and prints it so you can confirm ownership.
 * - Fetches UTXOs from Blockstream (mainnet/testnet endpoints).
 * - Emits a JSON body ready for your Rust /build_transfer route.
 *
 * Notes:
 * - Only supports P2WPKH (segwit v0) addresses in the current sample.
 * - If your UTXO is Taproot (P2TR), you need to adjust scriptPubKey detection and signing logic.
 */

const fetch = require('node-fetch');
const bitcoin = require('bitcoinjs-lib');
const { ECPairFactory } = require('ecpair');
const ecc = require('tiny-secp256k1');

bitcoin.initEccLib(ecc);
const ECPair = ECPairFactory(ecc);

async function main() {
  const [,, netArg, wif, toAddress, amountBtc, feeRate] = process.argv;
  if (!netArg || !wif || !toAddress || !amountBtc || !feeRate) {
    console.error('Usage: node fetch_utxos_and_build.js <NETWORK> <WIF> <TO_ADDRESS> <AMOUNT_BTC> <FEE_RATE_SAT_VB>');
    process.exit(1);
  }

  const network = netArg.toLowerCase() === 'testnet'
    ? bitcoin.networks.testnet
    : bitcoin.networks.bitcoin;

  const keyPair = ECPair.fromWIF(wif, network);

  // FIX: Wrap publicKey in Buffer to satisfy type checks
  const { address: fromAddress } = bitcoin.payments.p2wpkh({
    pubkey: Buffer.from(keyPair.publicKey),
    network
  });

  console.log(`Derived address from WIF: ${fromAddress}`);

  const baseUrl = network === bitcoin.networks.testnet
    ? 'https://blockstream.info/testnet/api'
    : 'https://blockstream.info/api';

  const utxosRes = await fetch(`${baseUrl}/address/${fromAddress}/utxo`);
  if (!utxosRes.ok) {
    console.error(`Error fetching UTXOs: ${utxosRes.statusText}`);
    process.exit(1);
  }
  const utxos = await utxosRes.json();
  if (utxos.length === 0) {
    console.error('No UTXOs found for this address.');
    process.exit(1);
  }

  const transferInput = {
    network: netArg.toLowerCase(),
    to_address: toAddress,
    amount_btc: amountBtc,
    change_address: fromAddress,
    fee_rate_sat_per_vb: parseInt(feeRate, 10),
    assume_taproot: false,
    utxos: utxos.map(u => ({
      txid: u.txid,
      vout: u.vout,
      amount_sats: u.value,
      script_pubkey_hex: getP2WPKHScriptPubKeyHex(fromAddress, network),
      sequence: null
    }))
  };

  console.log(JSON.stringify(transferInput, null, 2));
}

function getP2WPKHScriptPubKeyHex(address, network) {
  const payment = bitcoin.address.toOutputScript(address, network);
  return Buffer.from(payment).toString('hex');
}

main().catch(console.error);
