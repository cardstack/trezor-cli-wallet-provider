const { execSync } = require("child_process");
const Web3 = require("web3");
const HookedWalletSubprovider = require("@trufflesuite/web3-provider-engine/subproviders/hooked-wallet.js");
const numberToBN = require("number-to-bn"); // there is a bug in web3's BN that is not calculating hex correctly
const { toChecksumAddress } = Web3.utils;
const ETHEREUM_PATH = "m/44'/60'/0'/0";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

function trezorCtl(args) {
  let stdout = execSync(`trezorctl ${args}`, {
    // this allows the CLI to prompt for a PIN if needed, but also for us to
    // capture the result of the trezor command in stdout
    stdio: ["inherit", "pipe", "inherit"],
  });
  return String(stdout).trim();
}

class Trezor {
  constructor(opts = {}) {
    this.opts = {
      derivationPath: ETHEREUM_PATH,
      numberOfAccounts: 1,
      ...opts,
    };
  }

  getAccounts(cb) {
    let accounts;
    try {
      accounts = this.getAccountsSync();
    } catch (e) {
      cb(e.message);
    }
    if (accounts) {
      cb(null, accounts);
    }
  }

  getAccountsSync() {
    let accounts = [];
    for (let i = 0; i < this.opts.numberOfAccounts; i++) {
      accounts.push(
        trezorCtl(`ethereum get-address -n "${this.opts.derivationPath}/${i}"`)
      );
    }
    return accounts;
  }

  signTransaction(txn, cb) {
    let {
      to = "", // according to trezorctl docs, empty string designates contract creation
      from,
      gas: gasLimit,
      gasPrice,
      nonce,
      chainId,
      value = "0x0",
    } = txn;
    from = toChecksumAddress(from);
    to = to !== "" ? toChecksumAddress(to) : to;
    gasLimit = Number(numberToBN(gasLimit).toString());
    gasPrice = numberToBN(gasPrice).toString();
    value = numberToBN(value).toString();
    nonce = Number(numberToBN(nonce).toString());
    chainId = Number(numberToBN(chainId).toString());
    let addresses = this.getAccountsSync();
    let idx = addresses.findIndex((i) => i === from);
    if (idx === -1) {
      cb(
        `tried to sign transaction with a 'from' address that is not an address on this trezor ${from}. Possible addresses are ${addresses.join()}. Use 'numberOfAccounts' constructor option to increase available addresses.`
      );
    }
    if (idx > -1) {
      const path = `${this.opts.derivationPath}/${idx}`;
      let response;
      try {
        // --gas-limit is an integer
        // --gas-price is a string integer (wei)
        // --nonce is an integer
        // --data is a string hex: "0x1234"
        // --chain-id is an integer
        // "to" is a string hex: "0x1234" (or empty string for contract creation)
        // "value" is a string integer (wei)
        response = trezorCtl(
          `ethereum sign-tx --chain-id ${chainId} --address "${path}" --nonce ${nonce} --gas-limit ${gasLimit} --gas-price "${gasPrice}" --data "${txn.data}" "${to}" "${value}"`
        );
      } catch (e) {
        cb(e.message);
      }
      if (response) {
        let signedTxn = response.slice(response.indexOf("0x")).trim();
        cb(null, signedTxn);
      }
    }
  }
}

module.exports = class TrezorWalletProvider extends HookedWalletSubprovider {
  constructor(opts = {}) {
    let trezor = new Trezor(opts);
    super({
      getAccounts: trezor.getAccounts.bind(trezor),
      signTransaction: trezor.signTransaction.bind(trezor),
    });
  }
};