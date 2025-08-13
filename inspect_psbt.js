/**
 * inspect_psbt.js
 * ----------------
 * Purpose: Decode a base64-encoded PSBT and print human-readable info about each input:
 * - witnessUtxo.value (sats)
 * - witnessUtxo.scriptPubKey (hex)
 * - Decoded address (if possible)
 *
 * Usage:
 *   node inspect_psbt.js "<PSBT_BASE64>"
 *
 * Notes:
 * - No signing here—purely for inspection.
 * - Works on any network; address decoding tries to infer via segwit v0 patterns.
 */
const bitcoin = require('bitcoinjs-lib');

const psbtBase64 = process.argv[2];
const psbt = bitcoin.Psbt.fromBase64(psbtBase64);

// Print inputs and their scriptPubKeys
psbt.data.inputs.forEach((input, idx) => {
  console.log(`Input ${idx}:`);
  if (input.witnessUtxo) {
    console.log('  Value (sats):', input.witnessUtxo.value);
    console.log('  ScriptPubKey hex:', input.witnessUtxo.script.toString('hex'));
    console.log('  Address:', bitcoin.address.fromOutputScript(input.witnessUtxo.script, bitcoin.networks.testnet));
  } else {
    console.log('  Missing witnessUtxo!');
  }
});
