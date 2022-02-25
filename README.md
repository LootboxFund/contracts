# Lootbox Decentralized Exchange

<img width="1783" alt="Screen Shot 2022-01-29 at 11 49 32 PM" src="https://user-images.githubusercontent.com/97712061/151687043-7b6cd279-f086-487e-86d7-1af3f8c5983e.png">

👋 Welcome to Lootbox. 🏝️Cayman Islands, Dione.

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

## Setup

###  Guild FX Admin ⚙️  

> 💡 This only needs setup **once** by a Lootbox admin.

1.  Setup [Openzeppelin Defender Account](https://defender.openzeppelin.com/) for Lootbox Admins

    - Follow the steps in [Guild FX Defender Setup README](./readme/DEFENDER_SETUP_FOR_Lootbox_ADMIN.md)

2.  Deploy **🚜 Guild Factory 🚜**

          $ npm run deploy:testnet:guild-factory

    1. This will output a [log file](.scripts/logs/binance_testnet_97-deployGuildFactory_log_1643510668040.dev) with important addresses etc.

3.  **Manually** add the 📜 **Lootbox Constants** 📜 address & the **🚜 Guild Factory 🚜** address from the log file to variable `addresses.gfxConstants` & `address.gfxGuildFactory` in [constants.ts](./scripts/constants.ts).

    > 💡 You can find the 📜 **Lootbox "Constants"** 📜 from the log files from step 2.1.

4.  Deploy **🚜 Crowdsale Factory 🚜**

         $ npm run deploy:testnet:crowdsale-factory

5.  **Manually** add the **🚜 Crowdsale Factory 🚜** addres from the log file to variable `addresses.gfxCrowdSaleFactory` in [constants.ts](./scripts/constants.ts).

    > 💡 You can find the **🚜 Crowdsale Factory 🚜** from the log files from step 4.




6. Import the `GuildFactory` and `CrowdSaleFactory` addresses into OpenZeppelin Defender as an imported contract. 

7.  🕰 _Optional_: As the 👨‍👩‍👦‍👦 **Lootbox DAO** 👨‍👩‍👦‍👦, we can grant a Lootbox Staff Member 🔐 **GFX_STAFF_ROLE** 🔐 priviledges to the factories.

    > 💡 In the deployment scripts, the Lootbox DAO has already given 🔐 **GFX_STAFF_ROLE** 🔐 priviledges - hence the immediate use of this function is not needed.

    > 📆 TODO: Add Documentation about this process

6. Add the two factories to Defender so that you can manage them through the UI.

### Independent Guilds (AKA Artemis) ⚙️

1. We recomending following the [Guild Best Practices](./readme/GUILD_ADMIN_SETUP_BEST_PRACTICES.md) first

2. Set up the Guild's [Defender](https://Defender.openzeppelin.com/) account by following the [Guild Defender Setup](./readme/DEFENDER_SETUP_FOR_GUILDS.md) steps

3. Create your first guild token! Follow [the docs here](./readme/GUILD_CREATE_TOKEN.md). Note, your multisig must be whitelisted by Lootbox in order to create a Guild.

4. Create a crowdsale and hook it up to your guild token! Follow [the docs here](./readme/GUILD_CREATE_CROWDSALE.md)

5. Test purchasing from your crowdsale via OZ Defender admin proposal. Buy with tBNB, and also try buying with USDC. Remember to add the guild token to your metamask.

## 📔 Addresses

### BSC

> 📆 **TODO:** add prod addresses

### BSC Testnet

| Contract                     | Address                                    |
| ---------------------------- | ------------------------------------------ |
| Lootbox Treasury (multi sig) | 0xFec4243C1934907CF41298F868FdcCDfca9D7484 |
| Lootbox DAO (multi sig)      | 0x6A721843BAf298D49C709D0d77D23aDDE650AE44 |
| Lootbox DEV (multi sig)      | 0x6A721843BAf298D49C709D0d77D23aDDE650AE44 |
| Lootbox Constants            | 0x5523D8c92CE44f11b66607899415381eeBef1324 |
| Guild Factory                | 0x3A416836Ea500fe18838Bd67BAF15A8606b25ACc |
| Crowdsale Factory            | 0x5cCA43369cFd4743F45d1c7379Df0fd53563bCEA |

---

# Architecture

![backend-architecture (3)](https://user-images.githubusercontent.com/97712061/151687240-aaf9a04e-86fd-4172-beac-3853595669f1.png)
