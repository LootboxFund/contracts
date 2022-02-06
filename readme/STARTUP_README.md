# Developer Documentation

## Getting Started Locally
1. `$ npm install --save-dev hardhat` and choose advanced typescript
2. `$ npx hardhat compile` to compile smart contracts to ABI & EVM bytecode
3. `$ npx hardhat node` to run local blockchain
4. `$ npx hardhat run scripts/deploy.ts --network localhost` to deploy to local blockchain
5. Connect metamask to local blockchain be adding a new RPC network:
```
Network Name = "Hardhard Local"
New RPC URL = "http://127.0.0.1:8545"
Chain ID = "31337"
```
6. Import one of the Hardhat sandbox wallet accounts to your Metamask. Those sandbox accounts start with 10,000 ETH. Just copy the private key from the `npx hardhat node` console, and import it into Metamask. For full steps, [watch this video](https://youtu.be/FTDEX3S1eqU?t=229).
7. `$npx hardhat test` to run tests


## Deploying to Binance Smartchain TestNet
1. Switch your Metamask to the Binance Testnet, and get some testnet tokens from [this BNB faucet](https://testnet.binance.org/faucet-smart)
2. Ensure your `hardhat.config.js` file has the right network url & metamask private key. Whichever metamask private key account is used will end up being the deployer of the smart contract.
```js
// hardhat.config.js
module.exports = {
  solidity: "0.8.0",
  networks: {
    binance_testnet: {
      url: `https://https://data-seed-prebsc-1-s1.binance.org:8545/f111521389b4b4a5701c6b0b/bsc/testnet`,
      accounts: [`METAMASK_PRIVATE_KEY`]
    }
  }
};
```
3. Run the script to deploy `$ npx hardhat run scripts/deploy.ts --network binance_testnet` and take note of the contract ID
4. Visit [https://testnet.bscscan.com/](https://testnet.bscscan.com/) and search your contract ID
5. Import the custom token into your Metamask by adding the contract ID, and you should see it appear