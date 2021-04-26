const ProviderEngine = require("web3-provider-engine");
const FiltersSubprovider = require("web3-provider-engine/subproviders/filters.js");
const Web3Subprovider = require("web3-provider-engine/subproviders/provider.js");
const Web3 = require("web3");
const TrezorWalletProvider = require("./trezor-wallet-provider");

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
    return;
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
