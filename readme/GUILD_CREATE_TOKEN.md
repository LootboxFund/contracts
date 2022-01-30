## ⚙️ Setup - Creating a Guild Token

1. In Defender, click the "GuildFX Guild Factory" contract that you listed previously.

2. Click `+ New Proposal` button

   - Select an admin action

3. Create a new guild by making a multisig proposal to the guild fx guild factory

   > 💡 Here is an [example event](`https://testnet.bscscan.com/tx/0x4329d9d98cbc7237fd87b2f4df23b5071634294381dc12f9f8c13d9386c2e0ea`) from creating the Artemis Guild Token

   - Function: `createGuild`
   - guildName: `Artemis`
   - guildSymbol `ART`
   - guildDAO: Super Admin multisig vault
   - guildDev: Super Admin multisig vault
   - Execution Strategy: `Multisig`
     - Enter the Super Admin multisig vault
   - Proposal: `"Creating the Artemis Guild Token"`
   - Description: `"Kicking off the Artemis guild with a guild token ART!"`
   - Nice work! This proposal should now be viewable in the "Active proposals" section of Defender.

4. Approve & execute the guild creation proposal
