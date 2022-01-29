# GuildFX Decentralized Exchange

## Getting started

1. `cp .env.example .env`
   - fill `.env` with shared dev credentials (contact @0xnewton or 0xterran for access)
     - need google application credentials for gcp
     - testing wallet private keys
2. `yarn install`
3. `npx hardhat compile`
4. `npm run test` or `npx hardhat test test/file.test.js`

### Environment set up

1. Create a directory `env`
2.

### To set up a new test environment:

1. `npm run deploy:testnet:guild-factory`
   - This will output a [log file](.scripts/logs/deployGuildFactory_log_1643490853248.dev.txt) with name `"deployGuildTokenFactory_log_xxx.dev.txt"`
2. **Manually add** the "Constants Token Address" and "Guild Token Address" to the [crowdsale factory deploy script](./scripts/deployCrowdSaleFactory.dev.ts).
   - 💡 You can find the GuildFXConstants contract address and the GuildFX erc20votes token address from the log files from step 1.
   - 📆 TODO: Remove this manual step. Tracked [here](https://linear.app/guildfx/issue/GUI-75/generalize-dev-deployment-proceedure).
3. `npm run deploy:testnet:crowdsale-factory`
4. Propse and execute a `.whitelistMint()` on the crowdsale address via openzeppelin defender
   - 📆 TODO: tracked [here](https://linear.app/guildfx/issue/GUI-77/successfully-propose-execute-and-document-a-whitelistmint-with-the)

## Testnet Addresses

| Contract                                   | Address                                    |
| ------------------------------------------ | ------------------------------------------ |
| GuildFX Constants                          | 0x56ae9253E0311FfdEf27Aa53c8F8318D71b43699 |
| GuildFX Gamer Token                        | 0x63693bd1ba571035dde710ae2862e7f970fbe9dd |
| Crowdsale for Gamer Token                  |
| 0x8577ac56492b9fa85278b70b761db3dafa9c8c01 |
| Crowdsale Factory                          | 0x5E44410793AAEA932DD208CBf0277d2AA4c6Ae3D |
| Guild Factory                              | 0x22BF1dE40Ea175Ce7436ADA0eD8f89a85C0278cf |

## Guild Architecture Diagram

![Guild Architecture](https://user-images.githubusercontent.com/97712061/150672550-cf88525b-b097-4c43-8191-4702f3557daf.png)
