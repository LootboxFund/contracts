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

## ⚙️ Setup - Independent Guild DAOs

1. Install metamask chrome extension
2. Create account for [openzeppelin Defender](https://Defender.openzeppelin.com/)
3. Onboard other guild owners to your "team" in Defender

   - 🚨 Ensure other guild owner does **NOT** make an account in Defender 🚨 _they need to be onboarded by an invite._
   - Click `Settings` > `Collaborators` (see [more details](https://docs.openzeppelin.com/defender/account-management#user_management))
   - Click `Invite collaborator` button
   - Type co-founders email and click `Send invite`

4. Connect your wallet to `BSC_TESTNET` network in Defender
5. In Defender, create a multisig vault

   - Click the `+ Add contract` button
     - Select "Create Gnosis Safe" option
   - Name: `Artemis Guild`
   - Network: `BSC Testnet`
   - Owners:
     - Add your own metamask wallet address (from step 4)
     - Add the address of other guild co-founders
   - Threshold: should ideally be the number of owners you added above. I.e. 2 if there are 2 founders to the guild.
   - Click "Create Gnosis Safe" and confirm the transaction in metamask
     - This made the Gnosis Vault: `0x7Eaa1688E0a3F8B7167cc61263A669f37c344cF5`
   - Onboard other guild owners (only if you added more than one owner)
     - Copy the address and ABI of the vault created and send to other guild owners
     - Other guild owner will:
       - `+ Add Contract` (select `Import new contract`)
       - Name: `Artemis Guild`
       - Network: `BSC Testnet`
       - Address: `0x7Eaa1688E0a3F8B7167cc61263A669f37c344cF5` (_what you sent to the guild owner_)
       - ABI: _what was sent to the guild co-owner_

6. In Defender, add the contracts for the "guild factory" and "crowdsale factory"
   - Click the `+ Add contract` button
     - Select "Import Contract" option
   - Add the guild factory contract
     - Name: `Guild Factory`
     - Network: `BSC Testnet` _or_ `97`
     - Address: `0x78EFCA1479011d194cA9eA2324C82d5B52f72b09`
     - ABI: From [artifacts](./artifacts/contracts/GuildFactory.sol/GuildFactory.json).
   - Add the crowdsale
     - Name: `Crowdsale Factory`
     - Network: `BSC Testnet` _or_ `97`
     - Address: `0xbb762B79A41ACc57971d957c7A089b4e69Fd608a`
     - ABI: [artifacts](./artifacts/contracts/CrowdSaleFactory.sol/CrowdSaleFactory.json).

## ⚙️ Setup - Independent Guild Tokens

1. In Defender, click the "Guild Factory" contract you made in step `7`
2. Click `+ New Proposal` button
   - Select an admin action
3. Create a new guild by making a multisig proposal to the guild factory

- Function: `createGuild`
- guildName: `Artemis`
- guildSymbol `ART`
- guildDAO: address of your Gnosis Vault from step 7 (i.e. `0x7Eaa1688E0a3F8B7167cc61263A669f37c344cF5`)
- guildDev: can be the same as the guildDAO
- Execution Strategy: `Multisig`
  - Enter the address of the vault you created in step 7 (i.e. `0x7Eaa1688E0a3F8B7167cc61263A669f37c344cF5`)
- Proposal: `"Creating the Artemis Guild Token"`
- Description: `"Kicking off the Artemis guild with a guild token ART!"`
- Nice work! This proposal should now be viewable in the "Active proposals" section of Defender.

11. Approve the guild creation proposal

- Go to Defender's admin section and find the proposal, click it.
- Click `Approve` button. Make sure all guild owners have approved.

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
