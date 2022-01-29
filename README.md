# GuildFX Decentralized Exchange

## Getting started

1. `cp .env.example .env`
   - fill `.env` with shared dev credentials (contact @0xnewton or 0xterran for access)
     - need google application credentials for gcp
     - testing wallet private keys
2. `yarn install`
3. `npx hardhat compile`
4. `npm run test` or `npx hardhat test test/file.test.js`

### To set up a new test environment:

1. `npm run deploy:testnet:guild-factory`
   - This will output a [log file](.scripts/logs/deployGuildFactory_log_1643490853248.dev.txt) with name `"testnet-99_deployGuildTokenFactory_log_xxx.dev.txt"`
2. **Manually add** the "Constants Token Address" and "Guild Token Address" to the [crowdsale factory deploy script](./scripts/deployCrowdSaleFactory.dev.ts).
   - 💡 You can find the GuildFXConstants contract address and the GuildFX erc20votes token address from the log files from step 1. You need to **manually hardcode them in the script for now.**
3. `npm run deploy:testnet:crowdsale-factory`

## Testnet Addresses

### BSC Testnet

| Contract                                   | Address                                    |
| ------------------------------------------ | ------------------------------------------ |
| GuildFX Constants                          | 0x56ae9253E0311FfdEf27Aa53c8F8318D71b43699 |
| Guild Factory                              | 0x22BF1dE40Ea175Ce7436ADA0eD8f89a85C0278cf |
| Crowdsale Factory                          | 0x5E44410793AAEA932DD208CBf0277d2AA4c6Ae3D |
| GuildFX Gamer Token                        | 0x63693bd1ba571035dde710ae2862e7f970fbe9dd |
| Crowdsale for Gamer Token                  |
| 0x8577ac56492b9fa85278b70b761db3dafa9c8c01 |

### Rinkeby

| Contract                                   | Address                                    |
| ------------------------------------------ | ------------------------------------------ |
| GuildFX Constants                          | 0x01e4f496C2eBA3E868785E5cF87A0037D9a765Dc |
| Guild Factory                              | 0xaca6924f42Dc2596EAfF4e5BFaEeAa90d04C7278 |
| Crowdsale Factory                          | 0xb6C2650e26446bb3f3319e8D009C2A6dFC28B693 |
| GuildFX Gamer Token                        | 0xf9d82fad77e65651c12606d12d749e1cbe2cf4d1 |
| Crowdsale for Gamer Token                  |
| 0x51fa3a64c99b1e55639f07985d00b73236d871e2 |

## Guild Architecture Diagram

![Guild Architecture](https://user-images.githubusercontent.com/97712061/150672550-cf88525b-b097-4c43-8191-4702f3557daf.png)
