const ProviderEngine = require("web3-provider-engine");
const FiltersSubprovider = require("web3-provider-engine/subproviders/filters.js");
const Web3Subprovider = require("web3-provider-engine/subproviders/provider.js");
const Web3 = require("web3");
const TrezorWalletProvider = require("./trezor-wallet-provider");

/*
 * The opts are:
 *
 *   chainId: the chain ID of the network (mainnet = 0, xdai = 100, etc)
 *
 *   derivationPath: the derivation path to use to obtain the address
 *     (this fixes the wallet so that there is only one account available,
 *      which is the account specified by the derivationPath
 *
 *   derivationPathPrefix: the derivation path prefix,
 *      where the number of accounts that we'll load in the provider is specified
 *      by the numberOfAccounts. This will support signing for any of the accounts
 *      that we have loaded based on the derivation path prefix. This defaults to the
 *      BIP-44 ETH (coin = 60) derivation path prefix, "m/44'/60'/0'/0" if
 *      derivationPath is not specified.
 *
 *   numberOfAccounts: the number of accounts to load when the derivationPathPrefix
 *     is specified. This is ignored if derivationPath is specified
 */
module.exports = function (url, opts = {}) {
  let engine = new ProviderEngine();
  engine.addProvider(new TrezorWalletProvider(opts));
  engine.addProvider(new FiltersSubprovider());
  engine.addProvider(
    new Web3Subprovider(addSendAsync(new Web3.providers.HttpProvider(url)))
  );

  // Ugh... https://github.com/MetaMask/web3-provider-engine/issues/309
  engine.send = engine.sendAsync;

  engine.start();
  return engine;
};

function addSendAsync(provider) {
  if (provider.sendAsync) {
    return provider;
  }
  if (!provider.send) throw new Error('Provider must have a "send" method');

  provider.sendAsync = function (payload, callback) {
    // parity will barf if you include this in the payload
    // https://github.com/MetaMask/web3-provider-engine/issues/346
    // https://github.com/MetaMask/web3-provider-engine/issues/332
    if (typeof payload.skipCache !== "undefined") {
      delete payload.skipCache;
    }
    provider.send(payload, callback);
  }.bind(provider);
  return provider;
}
