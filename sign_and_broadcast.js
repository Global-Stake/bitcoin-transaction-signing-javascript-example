/**
 * sign_and_broadcast.js
 * ---------------------
 * Purpose: Sign all inputs (P2WPKH) of a PSBT using your WIF, validate, finalize, and
 * broadcast the raw transaction via Blockstream API.
 *
 * Usage:
 *   node sign_and_broadcast.js <NETWORK> <WIF> "<PSBT_BASE64>"
 *   Example:
 *     node sign_and_broadcast.js testnet cP... "cHNidP8B..."
 *
 * Behavior:
 * - Uses a custom signer that returns Buffers (required by bitcoinjs-lib).
 * - Uses an explicit validator: (pubkey, msghash, signature) => ecc.verify(...)
 * - Broadcasts to:
 *     mainnet: https://blockstream.info/api/tx
 *     testnet: https://blockstream.info/testnet/api/tx
 *     signet:  https://mempool.space/signet/api/tx
 *
 * Notes:
 * - If you see “No inputs were signed”, check:
 *   1) UTXO script matches your WIF-derived address
 *   2) Network matches (testnet vs mainnet)
 *   3) Input type (P2WPKH vs P2TR)
 *   4) PSBT includes `witnessUtxo` (or `nonWitnessUtxo`)
 */

const bitcoin = require('bitcoinjs-lib');
const { ECPairFactory } = require('ecpair');
const ecc = require('tiny-secp256k1');
bitcoin.initEccLib(ecc);
const ECPair = ECPairFactory(ecc);

function getNetwork(name) {
  const n = (name || '').toLowerCase();
  if (n === 'mainnet' || n === 'bitcoin') return bitcoin.networks.bitcoin;
  if (n === 'testnet') return bitcoin.networks.testnet;
  if (n === 'signet')  return bitcoin.networks.signet;
  if (n === 'regtest') return bitcoin.networks.regtest;
  throw new Error(`Unknown network: ${name}`);
}

function broadcastUrl(name) {
  const n = (name || '').toLowerCase();
  if (n === 'mainnet' || n === 'bitcoin') return 'https://blockstream.info/api/tx';
  if (n === 'testnet') return 'https://blockstream.info/testnet/api/tx';
  if (n === 'signet')  return 'https://mempool.space/signet/api/tx';
  if (n === 'regtest') throw new Error('No public broadcaster for regtest.');
  throw new Error(`Unknown network: ${name}`);
}

(async () => {
  try {
    const [,, netArg, wif, psbtB64] = process.argv;
    if (!netArg || !wif || !psbtB64) {
      console.error('Usage: node sign_and_broadcast.js <NETWORK> <WIF> "<PSBT_BASE64>"');
      process.exit(1);
    }

    const network = getNetwork(netArg);
    const keyPair = ECPair.fromWIF(wif, network);

    // Show the address (P2WPKH) controlled by this WIF
    const myP2WPKH = bitcoin.payments.p2wpkh({ pubkey: Buffer.from(keyPair.publicKey), network });
    console.log('WIF-derived address (p2wpkh):', myP2WPKH.address);

    const psbt = bitcoin.Psbt.fromBase64(psbtB64, { network });

    // Sign with a custom signer that returns Buffers
    const signer = {
      publicKey: Buffer.from(keyPair.publicKey),
      sign: (hash) => Buffer.from(ecc.sign(hash, keyPair.privateKey)),
    };

    let signed = 0;
    for (let i = 0; i < psbt.inputCount; i++) {
      try {
        psbt.signInput(i, signer, [bitcoin.Transaction.SIGHASH_ALL]);
        signed++;
      } catch (e) {
        console.log(`signInput(${i}) failed: ${e.message}`);
      }
    }

    if (signed === 0) {
      console.error('No inputs were signed. Common causes:\n' +
        '- UTXO scriptPubKey does not match your WIF’s address (wrong key)\n' +
        '- Network mismatch (testnet vs mainnet)\n' +
        '- Input type mismatch (Taproot vs P2WPKH)\n' +
        '- Missing witnessUtxo/nonWitnessUtxo in PSBT');
      process.exit(2);
    }

    // ✅ Explicit validator function expected by bitcoinjs-lib
    const validator = (pubkey, msghash, signature) => {
      try { return ecc.verify(msghash, pubkey, signature); }
      catch { return false; }
    };

    if (!psbt.validateSignaturesOfAllInputs(validator)) {
      throw new Error('Signature validation failed');
    }

    psbt.finalizeAllInputs();

    const tx = psbt.extractTransaction();
    const txHex = tx.toHex();
    const txid = tx.getId();

    console.log('\nSigned TX:');
    console.log(JSON.stringify({ txid, hex: txHex, signed_psbt_base64: psbt.toBase64() }, null, 2));

    // Broadcast
    const url = broadcastUrl(netArg);
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'text/plain' },
      body: txHex,
    });
    const text = await resp.text();

    if (!resp.ok) {
      console.error(`\nBroadcast failed: HTTP ${resp.status}`);
      console.error(text);
      process.exit(3);
    }

    console.log('\nBroadcast success!');
    console.log('Returned:', text.trim()); // usually the txid
  } catch (e) {
    console.error('Error:', e.message);
    process.exit(1);
  }
})();
