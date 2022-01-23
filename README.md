# GuildFX Decentralized Exchange

## Getting started

1. `cp .env.example .env`
2. fill `.env` with shared dev credentials (contact @0xnewton or 0xterran for access)
3. `yarn install`
4. `npx hardhat compile`
5. `npm run test`

### To set up a new test environment:

1. `npm run deploy:testnet:guild-token-factory`
   - This will output a [log file](./scripts/logs) with name `"deployGuildTokenFactory_log_xxx.dev.txt"`
2. **Manually add** the "Constants Token Address" and "Guild Token Address" (rom the log file from step 1 to the [crowdsale factory deploy script](./scrips/deployCrowdSaleFactory.dev.ts)
   - 📆 TODO: Remove this manual step. Tracked [here](https://linear.app/guildfx/issue/GUI-75/generalize-dev-deployment-proceedure).
3. `npm run deploy:testnet:crowdsale-factory`
4. Propse and execute a `.whitelistMint()` on the crowdsale address via openzeppelin defender
   - 📆 TODO: tracked [here](https://linear.app/guildfx/issue/GUI-77/successfully-propose-execute-and-document-a-whitelistmint-with-the)

## Testnet Addresses

| Contract                     | Address                                    |
| ---------------------------- | ------------------------------------------ |
| GuildFX Constants            | 0xDDda75Eb9afC7297444C6070B696C103d809C3F7 |
| GuildFX Gamer Token          | 0x6bb2f28972abf66cf4a007fddd8f354060b8663d |
| GuildFX Gamer Token Governor | 0xee01a948e12e923afc65a82bfbdf535c31aa979e |
| Crowdsale Factory            | 0x8d4086d9781172F1952461dA4F96Ae46D1fFaC09 |
| Guild Factory                | 0x3a350126C00350D758c35ca1D107A8C6e22a40FD |

## Guild Architecture Diagram

![Guild Architecture](https://user-images.githubusercontent.com/97712061/150672550-cf88525b-b097-4c43-8191-4702f3557daf.png)
