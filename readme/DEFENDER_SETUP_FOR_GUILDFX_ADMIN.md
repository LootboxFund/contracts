# GuildFX Defender Setup

### GuildFX has 3 multisig contracts in Openzeppelin Defender.

- Treasury Treasury

- GuildFX DAO

- GuildFX Developer

See contract addresses [here](../scripts/constants.ts#56).

## ⚙️ Setup - Guild FX Admin Defender

> 💡 This only needs to happen once per environment.

1. Create an account in openzeppelin defender

   - 🚨 Ensure only one guild owner creates an account in Defender because _other guild owners will be onboarded via invite._

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
