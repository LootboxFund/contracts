# Guild Defender Setup

### Guilds have 1 multisig "super admin" contract

- A "Super Admin" is a multisig vault that represents the guild's Treasury, DAO and developer all in one address.

## ⚙️ Setup - Independent Guild Defender Account

1. First make sure you have followed the [guild's best practices](./GUILD_ADMIN_SETUP_BEST_PRACTICES.md)

2. Create admin [Openzeppelin Defender](https://Defender.openzeppelin.com/)

3. Onboard other guild owners to your "team" in Defender

   - 🚨 Ensure other guild owner does **NOT** make an account in Defender 🚨 _they need to be onboarded by an invite._
   - Click `Settings` > `Collaborators` (see [more details](https://docs.openzeppelin.com/defender/account-management#user_management))
   - Click `Invite collaborator` button
   - Type co-founders email and click `Send invite`

4. Connect your wallet to `BSC_TESTNET` network in Defender

5. In Defender, create a multisig vault "Super Admin"

   - Click the `+ Add contract` button

   - Select "Create Gnosis Safe" option
   - Name: `Artemis Super Admin`
   - Network: `BSC Testnet`
   - Owners:
     - Add your own metamask wallet address
     - Add the address of other guild co-founders
   - Threshold: should ideally be the number of owners you added above. I.e. 2 if there are 2 founders to the guild.
   - Click "Create Gnosis Safe" and confirm the transaction in metamask

6. In Defender, add the contracts for the "guild factory" & "crowdsale factory"

   - Click the `+ Add contract` button
     - Select "Import Contract" option
   - Add the GuildFX guild factory
     - Name: `GuildFX Guild Factory`
     - Network: `BSC Testnet` _or_ `97`
     - Address: guild factory address from [local constants file](../scripts/constants.ts)
     - ABI: From [artifacts](./artifacts/contracts/GuildFactory.sol/GuildFactory.json).
   - Add the GuildFX crowdsale factory
     - Name: `GuildFX Crowdsale Factory`
     - Network: `BSC Testnet` _or_ `97`
     - Address: crowdsale factory address from [local constants file](../scripts/constants.ts)
     - ABI: [artifacts](./artifacts/contracts/CrowdSaleFactory.sol/CrowdSaleFactory.json).

7. Contact representative GuildFX staff member. Request that they whitelist your super guild (they should do this via Defender).

   - [GFX_STAFF] Whitelist the "Super Admin" in the `guildFactory` via `.whitelistGuildOwner()`
   - [GFX_STAFF] Whitelist the "Super Admin" in the `crowdsaleFactory` via `.whitelistGuildOwner()`

8. Create your guild token (follow [docs](./GUILD_CREATE_TOKEN.md))

9. Create your crowdsale TODO
