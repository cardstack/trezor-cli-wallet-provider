import { execSync } from "child_process";
//@ts-ignore
import HookedWalletSubprovider from "@trufflesuite/web3-provider-engine/subproviders/hooked-wallet.js";

type Callback = (error: any, result?: any) => void;
interface TrezorOptions {
  chainId: number;
  derivationPath: string;
  numberOfAccounts: number;
}
interface Transaction {
  to: string;
  nonce: number;
  gasPrice: string;
  gasLimit: number;
  value: string;
  data: string;
}

const ETHEREUM_PATH = "m/44'/60'/0'/0";
class Trezor {
  opts: TrezorOptions;
  constructor(opts: Partial<TrezorOptions> = {}) {
    this.opts = {
      chainId: 1, // mainnet
      derivationPath: ETHEREUM_PATH,
      numberOfAccounts: 1,
      ...opts,
    };
  }

  getAccounts(cb: Callback) {
    let accounts = [];
    for (let i = 0; i < this.opts.numberOfAccounts; i++) {
      try {
        accounts.push(
          trezorCtl(
            `ethereum get-address -n "${this.opts.derivationPath}/${i}"`
          )
        );
      } catch (e) {
        cb(e.message);
        return;
      }
    }
    cb(null, accounts);
  }

  signTransaction(txn: Transaction, cb: Callback) {
    // TODO need to see how we choose which derivation path to use from the txn
    // data, for now just signing with the first address
    const path = `${this.opts.derivationPath}/0`;
    let response: string | undefined;
    try {
      // --gas-limit is an integer
      // --gas-price is a string integer (wei)
      // --nonce is an integer
      // --data is a string hex: "0x1234"
      // "to" is a string hex: "0x1234"
      // "value" is a string integer (wei)
      response = trezorCtl(
        `ethereum sign-tx --address "${path}" --nonce ${txn.nonce} --gas-limit ${txn.gasLimit} --gas-price "${txn.gasPrice}" --data "${txn.data}" "${txn.to}" "${txn.value}"`
      );
    } catch (e) {
      cb(e.message);
      return;
    }
    let signedTxn = response.slice(response.indexOf("0x")).trim();
    cb(null, signedTxn);
  }
}

export default class TrezorWalletProvider extends HookedWalletSubprovider {
  // constructor(path = ETHEREUM_PATH) {
  //   super({
  //     getAccounts: function (cb) {},
  //     signTransaction: function (txParams, cb) {},
  //   });
  // }
}

function trezorCtl(args: string): string {
  let stdout = execSync(`trezorctl ${args}`, {
    // this allows the CLI to prompt for a PIN if needed, but also for us to
    // capture the result of the trezor command in stdout
    stdio: ["inherit", "pipe", "inherit"],
  });
  return String(stdout);
}

// function normalize(hex?: string): string | null {
//   if (hex == null) {
//     return null;
//   }
//   if (hex.startsWith("0x")) {
//     hex = hex.substring(2);
//   }
//   if (hex.length % 2 != 0) {
//     hex = "0" + hex;
//   }
//   return hex;
// }

// test driver
let trezor = new Trezor({ chainId: 77 });
trezor.signTransaction(
  {
    to: "0x7314e0f1c0e28474bdb6be3e2c3e0453255188f8",
    value: "100",
    data: "0x01",
    nonce: 0,
    gasPrice: "20000000000",
    gasLimit: 300000,
  },
  (err: string, result: string) => {
    if (err) {
      console.log(`trezor error: ${err}`);
    } else {
      console.log(`signed txn: ${result}`);
    }
    process.exit();
  }
);
