# GlobalStake Bitcoin PSBT Tools

This repository contains all the scripts and documentation needed to **inspect**, **build**, **sign**, and optionally **broadcast** Bitcoin transactions produced by the [GlobalStake Bitcoin API](https://globalstake.io/), however it will be compatiable with any PSBT builder.

The tooling here focuses on **SegWit v0 (P2WPKH)** transaction flows and uses [`bitcoinjs-lib`](https://github.com/bitcoinjs/bitcoinjs-lib) + [`tiny-secp256k1`](https://github.com/bitcoinjs/tiny-secp256k1) for cryptographic operations.  
Testnet is the default network for examples, but you can run against mainnet, signet, or regtest with the correct arguments.

---

## Features

- **Inspect** a PSBT before signing
- **Verify** a WIF corresponds to an expected address
- **Build** the `/build_transfer` request body manually or automatically (by fetching UTXOs from Blockstream API)
- **Sign** PSBTs with debug output (to diagnose signing issues)
- **Sign & Broadcast** transactions directly to the Bitcoin network

---

## Scripts

### `inspect_psbt.js`
Decode a base64-encoded PSBT and print per-input details:
- UTXO value (sats)
- ScriptPubKey (hex)
- Decoded address (if possible)
- Match check vs your signing address

---

### `verify_pk.js`
Given a WIF and a network, derive the **P2WPKH** address and print its scriptPubKey.  
Useful for confirming that your signing key matches a given UTXO’s locking script.

---

### `fetch_utxos_and_build.js`
Fetch UTXOs for a given address via the Blockstream API, then auto-generate the JSON payload for `/build_transfer`.  
Eliminates the need to manually type in txid/vout/value/scriptPubKey for inputs you control.


---

### `sign_and_broadcast.js`
Signs all inputs, validates & finalizes, and broadcasts the transaction to the Bitcoin network using the Blockstream API.  
Supports mainnet, testnet, and signet.

---

## Installation

```bash
npm init -y
npm install bitcoinjs-lib ecpair tiny-secp256k1 node-fetch@3
