/**
 * verify_pk.js
 * ------------
 * Purpose: Given a WIF and a network, derive the P2WPKH (bech32) address and show its scriptPubKey.
 *
 * Usage:
 *   node verify_pk.js testnet <WIF>
 *
 * Notes:
 * - Helps confirm that your WIF corresponds to the address you think it does.
 * - Only demonstrates P2WPKH (segwit v0). If your UTXO is Taproot, you’ll need a P2TR variant.
 */

const bitcoin = require('bitcoinjs-lib');
const ECPairFactory = require('ecpair').ECPairFactory;
const tinysecp = require('tiny-secp256k1');

const ECPair = ECPairFactory(tinysecp);

// Replace with your WIF
const wif = '<PK HERE>';

const keypair = ECPair.fromWIF(wif, bitcoin.networks.testnet);

// FIX: Ensure pubkey is a Buffer
const { address } = bitcoin.payments.p2wpkh({
  pubkey: Buffer.from(keypair.publicKey),
  network: bitcoin.networks.testnet
});

console.log("Address from WIF:", address);
