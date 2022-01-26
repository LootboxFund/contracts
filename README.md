# GuildFX Decentralized Exchange

## Getting started

1. `cp .env.example .env`
2. fill `.env` with shared dev credentials (contact @0xnewton or 0xterran for access)
3. `yarn install`
4. `npx hardhat compile`
5. `npm run test` or `npx hardhat test test/file.test.js`

### To set up a new test environment:

1. `npm run deploy:testnet:guild-factory`
   - This will output a [log file](./scripts/logs) with name `"deployGuildTokenFactory_log_xxx.dev.txt"`
2. **Manually add** the "Constants Token Address" and "Guild Token Address" to the [crowdsale factory deploy script](./scripts/deployCrowdSaleFactory.dev.ts).
   - 💡 You can find the GuildFXConstants contract address and the GuildFX erc20votes token address from the log files from step 1.
   - 📆 TODO: Remove this manual step. Tracked [here](https://linear.app/guildfx/issue/GUI-75/generalize-dev-deployment-proceedure).
3. `npm run deploy:testnet:crowdsale-factory`
4. Propse and execute a `.whitelistMint()` on the crowdsale address via openzeppelin defender
   - 📆 TODO: tracked [here](https://linear.app/guildfx/issue/GUI-77/successfully-propose-execute-and-document-a-whitelistmint-with-the)

## Testnet Addresses

| Contract                     | Address                                    |
| ---------------------------- | ------------------------------------------ |
| GuildFX Constants            | 0xAF761E630B936F4892c05C1aBcfD614559AdD35e |
| GuildFX Gamer Token          | 0xe5faebe2dbc746a0fe99fe2924db1c6bf2ac3160 |
| GuildFX Gamer Token Governor | 0xeafc5fca009cba5ff94eed111d0a71ba8140b065 |
| Crowdsale Factory            | 0x5b91b93e15ECe970adAB22C3f071d0577f5D0dBc |
| Guild Factory                | 0x89D0d12598D397534eC3CeCA4cDaC1723D273C67 |

## Guild Architecture Diagram

![Guild Architecture](https://user-images.githubusercontent.com/97712061/150672550-cf88525b-b097-4c43-8191-4702f3557daf.png)
