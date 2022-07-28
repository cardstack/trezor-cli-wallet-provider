# trezor-cli-wallet-provider
A CLI based web3 trezor wallet provider. This provider relies on the Trezor wallet's
Python based command line interface `trezorctl` https://wiki.trezor.io/Using_trezorctl_commands_with_Trezor
. In order to use this you must ensure the `trezorctl` is installed correctly.

**Note: Please ensure your trezor firmware is up-to-date**

## Installing `trezorctl`
- Install python 3.5+
    ```
    brew update
    brew install pip3
    ```
- Install python dependencies
    ```
    pip3 install setuptools wheel attrs web3 rlp trezor
    ```
 - update your `$PATH` by sourcing your profile so that `trezorctl` is available in your path.
 Execute the following to confirm `trezorctl` has been installed.
    ```
    trezorctl --version
    ```
  - Install Trezor Bridge https://wiki.trezor.io/Trezor_Bridge. And reconnect your Trezor device after this step.

  ## Unlocking Your Trezor (Model One only)
  The trezor will go into sleep mode after a specified period of inactivity (10 minute by default).
  When you are asked for PIN, you have to enter scrambled PIN. Follow the
  numbers shown on Trezor display and enter the their positions using the
  numeric keyboard mapping (this will be displayed on the CLI to aid you):

  |   |   |   |
  |---|---|---|
  | 7 | 8 | 9 |
  | 4 | 5 | 6 |
  | 1 | 2 | 3 |

  Example: your PIN is **1234** and Trezor is displaying the following:

  |   |   |   |
  |---|---|---|
  | 2 | 8 | 3 |
  | 5 | 4 | 6 |
  | 7 | 9 | 1 |

  You have to enter: **3795**

  You may bypass the CLI unlock prompt by using the Trezor Bridge to unlock your wallet
  (the CLI unlock is a bit of a mind puzzle 🤪). To do so, navigate to https://wallet.trezor.io,
  make sure your trezor is connected, and enter the PIN to unlock your trezor when prompted.

  ## Unlocking Your Trezor (Model T only)
  For a Model T, then just unlock your Trezor from its screen before you start using it.

  ## Configuring Truffle
  To use this provider in truffle you can add this provider like so in your `truffle-config.js`:
  ```js
  const TrezorWalletProvider = require("trezor-cli-wallet-provider");
  module.exports = {
    networks: {
      xdai: {
        provider: function () {
        return new TrezorWalletProvider("https://rpc.xdaichain.com/", {
          chainId: 100,
        });
      },
      gasPrice: 1000000000,
      network_id: 100,
      }
    }
  }
  ```

Where the constructor is initialized with a:
- A JSON-RPC URL like infura, blockscout, etc.
- An optional options object that can specify:
  - `chainId` The chain ID of the network. This is exactly the same as the `network_id`, we provide it here too, because not all web3 clients initialize the txn object in a way that includes the chain ID. If this is not specified, then chain ID of `1` (Ethereum mainnet) is used as the default.
  - `derviationPath` A specific derivation path to use, e.g. `m/44'/60'/0'/0/13`. When this option is specified the only account available in your wallet will be the derivation path that you specify and the `derviationPathPrefix` and `numberOfAccounts` options will be ignored.
  - `derivationPathPrefix` The derivation path prefix (not including the address index) to use. This defaults to `m/44'/60'/0'/0` which is the default derivation path for Ethereum.
  - `numberOfAccounts` This is used to return address on the Trezor wallet. This defaults to just a single address (the first derivation path), but you can include more. There is a pretty significant performance penalty for additional addresses.

When truffle migrate or a truffle script sign a transaction, a prompt will appear on the command line to
confirm the details of the transaction, like so:
```
Please confirm action on your Trezor device.
```
If the trezor is locked, it will first prompt you to enter your pin using the procedure described above.

Here is a little video demo of the provider in action: https://www.loom.com/share/364c1321eadf488aaf767ad008365e44

## Additional Considerations
Do note that this web3 provider does not seem to work with the OpenZeppelin CLI (if someone can figure
out why, I'd love to get a PR). So if you'd like to use upgradeable contracts, I's suggest using
`truffle migrate` paired with `@openzeppelin/truffle-upgrades` pkg https://docs.openzeppelin.com/upgrades-plugins/1.x/.