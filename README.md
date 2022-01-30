# GuildFX Decentralized Exchange

<img width="1783" alt="Screen Shot 2022-01-29 at 11 49 32 PM" src="https://user-images.githubusercontent.com/97712061/151687043-7b6cd279-f086-487e-86d7-1af3f8c5983e.png">

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

    1. _0xnewton_ (or _0xterran_) to create an account in openzeppelin defender
       - 🚨 Ensure only one guild owner creates an account in Defender 🚨 _other guild owners will be onboarded via invite._
    2. Onboard other GuildFX admins to your "team" in Defender
       - Click `Settings` > `Collaborators` (see [more details](https://docs.openzeppelin.com/defender/account-management#user_management))
       - Click `Invite collaborator` button
       - Type co-founders email and click `Send invite`
       - _0xnewton_: `0xnewton@protonmail.com`
       - _0xterran_: `0xterran@gmail.com`
    3. Create a 🏦 **GuildFX Treasury** 🏦 Gnosis Multisig Vault

       - Click the `+ Add contract` button
       - Select "Create Gnosis Safe" option
       - Name: `GuildFX Treasury`
       - Network: `BSC Testnet`
       - Owners: Add `0xnetwon` (`0x2C83b49EdB3f00A38331028e2D8bFA3Cd93B8288`) and `0xterran` (`0x26dE296ff2DF4eA26aB688B8680531D2B1Bb461F`)
       - Threshold: `2` (or number of owners)
       - Click "Create Gnosis Safe" and confirm the transaction in metamask
         - This made the Gnosis Vault: `0xFec4243C1934907CF41298F868FdcCDfca9D7484`
         - 🙇‍♂️ Add address into the `addresses.gfxTreasury` constant in [constants.ts](./scripts/constants.ts)

    4. Create a 👨‍👩‍👦‍👦 **GuildFX DAO** 👨‍👩‍👦‍👦 Gnosis Multisig Vault

       - Click the `+ Add contract` button
       - Select "Create Gnosis Safe" option
       - Name: `GuildFX DAO`
       - Network: `BSC Testnet`
       - Owners: Add `0xnetwon` (`0x2C83b49EdB3f00A38331028e2D8bFA3Cd93B8288`) and `0xterran` (`0x26dE296ff2DF4eA26aB688B8680531D2B1Bb461F`)
       - Threshold: `2` (or number of owners)
       - Click "Create Gnosis Safe" and confirm the transaction in metamask
         - This made the Gnosis Vault: `0x6A721843BAf298D49C709D0d77D23aDDE650AE44`
         - 🙇‍♂️ Add address into the `addresses.gfxDAO` constant in [constants.ts](./scripts/constants.ts)

    5. Create a 👨‍💻 **GuildFX Developer** 👨‍💻 Gnosis Multisig Vault

       - Click the `+ Add contract` button
       - Select "Create Gnosis Safe" option
       - Name: `GuildFX Developer`
       - Network: `BSC Testnet`
       - Owners: Add `0xnetwon` (`0x2C83b49EdB3f00A38331028e2D8bFA3Cd93B8288`) and `0xterran` (`0x26dE296ff2DF4eA26aB688B8680531D2B1Bb461F`)
       - Threshold: `2` (or number of owners)
       - Click "Create Gnosis Safe" and confirm the transaction in metamask
         - This made the Gnosis Vault: `0x3Df7976965928D3b15E69A9e8A81361e7C08C9bc`
         - 🙇‍♂️ Add address into the `addresses.gfxDeveloper` constant in [constants.ts](./scripts/constants.ts)

2.  Deploy **🚜 Guild Factory 🚜**

          $ npm run deploy:testnet:guild-factory

    1. This will output a [log file](.scripts/logs/binance_testnet_97-deployGuildFactory_log_1643510668040.dev) with important addresses etc.
    2. **Manually** add the 📜 **GuildFX Constants** 📜 address from the log file to variable `addresses.gfxConstants` in [constants.ts](./scripts/constants.ts).

       > 💡 You can find the 📜 **GuildFX "Constants"** 📜 from the log files from step 2.1.

3.  Deploy **🚜 Crowdsale Factory 🚜**

         $ npm run deploy:testnet:crowdsale-factory

4.  🕰 _Optional_: As the 👨‍👩‍👦‍👦 **GuildFX DAO** 👨‍👩‍👦‍👦, we can grant a GuildFX Staff Member 🔐 **GFX_STAFF_ROLE** 🔐 priviledges to the factories.

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
     - Address: `0xc6d7Dfe0dE67651173c1f75b8E3deee0c9129909`
     - ABI: Will be provided ###TODO
   - Add the crowdsale
     - Name: `Crowdsale Factory`
     - Network: `BSC Testnet` _or_ `97`
     - Address: `0x853C810E0d23A69630bbaa749DDC5d7b14777146`
     - ABI: Will be provided ###TODO

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
| GuildFX Constants            | 0xf2fDdd8f938bC48989C4866f35D9eA26ccB53DD0 |
| Guild Factory                | 0x78EFCA1479011d194cA9eA2324C82d5B52f72b09 |
| Crowdsale Factory            | 0x8e9a6a675C9f7aaB4CfAAA3f8ff6284CE30d5Eea |

---

# Architecture

![backend-architecture (3)](https://user-images.githubusercontent.com/97712061/151687240-aaf9a04e-86fd-4172-beac-3853595669f1.png)
