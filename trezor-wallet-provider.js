const { execSync } = require("child_process");
const Web3 = require("web3");
const HookedWalletSubprovider = require("@trufflesuite/web3-provider-engine/subproviders/hooked-wallet.js");
// there is a bug in web3's BN that is not calculating hex correctly, so we use this instead
const numberToBN = require("number-to-bn");
const tmp = require("tmp");

const { toChecksumAddress } = Web3.utils;
const fs = require("fs");

const ETHEREUM_PATH = "m/44'/60'/0'/0";

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
      chainId: 1,
      derivationPathPrefix: ETHEREUM_PATH,
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
    if (this.cachedAccounts && this.cachedAccounts.length) {
      return this.cachedAccounts;
    }

    this.cachedAccounts = [];
    if (this.opts.derivationPath) {
      this.cachedAccounts.push(
        trezorCtl(`ethereum get-address -n "${this.opts.derivationPath}"`)
      );
      return this.cachedAccounts;
    }

    for (let i = 0; i < this.opts.numberOfAccounts; i++) {
      this.cachedAccounts.push(
        trezorCtl(
          `ethereum get-address -n "${this.opts.derivationPathPrefix}/${i}"`
        )
      );
    }
    return this.cachedAccounts;
  }

  signTransaction(txn, cb) {
    let {
      to = "", // according to trezorctl docs, empty string designates contract creation
      from,
      gas: gasLimit,
      gasPrice,
      nonce,
      value = "0x0",
    } = txn;
    from = toChecksumAddress(from);
    to = to !== "" ? toChecksumAddress(to) : to;
    gasLimit = numberToBN(gasLimit).toString();
    gasPrice = numberToBN(gasPrice).toString();
    value = numberToBN(value).toString();
    nonce = numberToBN(nonce).toString();
    let addresses = this.getAccountsSync();
    let idx = addresses.findIndex((i) => i === from);
    if (idx === -1) {
      cb(
        `tried to sign transaction with a 'from' address that is not an address on this trezor ${from}. Possible addresses are ${addresses.join()}. Use 'numberOfAccounts' constructor option to increase available addresses.`
      );
    }
    if (idx > -1) {
      const path = this.opts.derivationPath
        ? this.opts.derivationPath
        : `${this.opts.derivationPathPrefix}/${idx}`;
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
          `ethereum sign-tx --chain-id ${this.opts.chainId} --address "${path}" --nonce ${nonce} --gas-limit ${gasLimit} --gas-price "${gasPrice}" --data "${txn.data}" "${to}" "${value}"`
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

  signTypedMessage(txn, cb) {
    let { from, data } = txn;
    let addresses = this.getAccountsSync();
    let idx = addresses.findIndex((i) => i === from);
    const path = this.opts.derivationPath
      ? this.opts.derivationPath
      : `${this.opts.derivationPathPrefix}/${idx}`;
    // tmp file created because `ethereum sign-typed-data` takes file path as input.
    tmp.file(
      { postfix: ".json" },
      function _tempFileCreated(err, filePath, fd, cleanupCallback) {
        if (err) throw err;
        let response;
        fs.writeFileSync(filePath, JSON.stringify(data), function (err) {
          if (err) throw err;
        });
        try {
          let command = `ethereum sign-typed-data --address "${path}" ${filePath}`;
          response = trezorCtl(command);
        } catch (e) {
          console.log(e);
        }
        cleanupCallback();
        if (response) {
          let keyword = "signature: 0x";
          let signedTxn = response.slice(
            response.indexOf(keyword) + keyword.length
          );
          cb(null, signedTxn);
        }
      }
    );
  }
}

module.exports = class TrezorWalletProvider extends HookedWalletSubprovider {
  constructor(opts = {}) {
    let trezor = new Trezor(opts);
    super({
      getAccounts: trezor.getAccounts.bind(trezor),
      signTransaction: trezor.signTransaction.bind(trezor),
      signTypedMessage: trezor.signTypedMessage.bind(trezor),
    });
  }
};
