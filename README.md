# GuildFX Decentralized Exchange

<img width="1783" alt="Screen Shot 2022-01-29 at 11 49 32 PM" src="https://user-images.githubusercontent.com/97712061/151687043-7b6cd279-f086-487e-86d7-1af3f8c5983e.png">

👋 Welcome to GuildFX. 🏝️Cayman Islands, Dione.

## Getting started

1.  Setup environment

    ```
    $ cp .env.example .env
    ```

    - point gcp application credentials to json file containing gcp config
    - add testing wallet private keys from lastpass

2.  Dependencies

    ```
    $ yarn install
    ```

3.  Compile hardhat

    ```
    npx hardhat compile
    ```

4.  Ensure tests are working

    ```
    $ npm run test # or npx hardhat test test/file.test.js
    ```

## ⚙️ Setup - Guild FX Admin

> 💡 This only needs setup **once** by a GuildFX admin.

1.  Setup [Openzeppelin Defender Account](https://defender.openzeppelin.com/) for GuildFX Admins

    - Follow the steps in [Guild FX Defender Setup README](./readme/GUILD_FX_DEFENDER_SETUP.md)

2.  Deploy **🚜 Guild Factory 🚜**

          $ npm run deploy:testnet:guild-factory

    1. This will output a [log file](.scripts/logs/binance_testnet_97-deployGuildFactory_log_1643510668040.dev) with important addresses etc.

3.  **Manually** add the 📜 **GuildFX Constants** 📜 address from the log file to variable `addresses.gfxConstants` in [constants.ts](./scripts/constants.ts).

    > 💡 You can find the 📜 **GuildFX "Constants"** 📜 from the log files from step 2.1.

4.  Deploy **🚜 Crowdsale Factory 🚜**

         $ npm run deploy:testnet:crowdsale-factory

5.  🕰 _Optional_: As the 👨‍👩‍👦‍👦 **GuildFX DAO** 👨‍👩‍👦‍👦, we can grant a GuildFX Staff Member 🔐 **GFX_STAFF_ROLE** 🔐 priviledges to the factories.

    > 💡 In the deployment scripts, the GuildFX DAO has already given 🔐 **GFX_STAFF_ROLE** 🔐 priviledges - hence the immediate use of this function is not needed.

    > 📆 TODO: Add Documentation about this process

## ⚙️ Setup - Independent Guild DAOs (AKA Artemis)

1. We recomending following the [Guild Best Practices](./readme/GUILD_ADMIN_SETUP_BEST_PRACTICES.md) first

2. Set up the Guild's [Defender](https://Defender.openzeppelin.com/) account by following the [Guild Defender Setup](./readme/GUILD_DEFENDER_SETUP.md) steps

3. Create your first guild token! Follow [the docs here](./readme/GUILD_CREATE_TOKEN.md)

## 📔 Addresses

### BSC

> 📆 **TODO:** add prod addresses

### BSC Testnet

| Contract                     | Address                                    |
| ---------------------------- | ------------------------------------------ |
| GuildFX Treasury (multi sig) | 0xFec4243C1934907CF41298F868FdcCDfca9D7484 |
| GuildFX DAO (multi sig)      | 0x6A721843BAf298D49C709D0d77D23aDDE650AE44 |
| GuildFX DEV (multi sig)      | 0x6A721843BAf298D49C709D0d77D23aDDE650AE44 |
| GuildFX Constants            | 0x64F79B84CaA7e8f5763e578F4EA67385C68Fc74b |
| Guild Factory                | 0x78EFCA1479011d194cA9eA2324C82d5B52f72b09 |
| Crowdsale Factory            | 0xbb762B79A41ACc57971d957c7A089b4e69Fd608a |

---

# Architecture

![backend-architecture (3)](https://user-images.githubusercontent.com/97712061/151687240-aaf9a04e-86fd-4172-beac-3853595669f1.png)
