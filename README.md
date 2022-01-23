# GuildFX Decentralized Exchange

## Getting started

1. `cp .env.example .env`
2. fill `.env` with shared dev credentials (contact @0xnewton or 0xterran for access)
3. `yarn install`
4. `npx hardhat compile`
5. `npm run test`

### To set up a new test environment:

_📆 TODO: Generalize this deployment processes. See the [backlog item](https://linear.app/guildfx/issue/GUI-75/generalize-dev-deployment-proceedure) to track this._

1. `npm run deploy:testnet:guild-token-factory`
   - This will output a [log file](./scripts/logs) with name `"deployGuildTokenFactory_log_xxx.dev.txt"`
2. Find your log file, and add the "Constants Token Address" and "Guild Token Address" to the [crowdsale factory deploy script](./scrips/deployCrowdSaleFactory.dev.ts)
3. `npm run deploy:testnet:crowdsale-factory`

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
