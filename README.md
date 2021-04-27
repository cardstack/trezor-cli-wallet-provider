# trezor-cli-wallet-provider
A CLI based web3 trezor wallet provider. This provider relies on the Trezor wallet's
Python based command line interface `trezorctl` https://wiki.trezor.io/Using_trezorctl_commands_with_Trezor
. In order to use this you must ensure the `trezorctl` is installed correctly.

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

  ## Unlocking Your Trezor
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
