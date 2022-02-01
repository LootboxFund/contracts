## Setup - Creating a Crowd Sale

1. In Defender, click the "GuildFX Crowdsale Factory" contract that you listed previously.

2. Get the address of the guild token you created in another tutorial

3. Click `+ New Proposal` button

   - Select an admin action

4. Create a new crowdsale by making a multisig proposal to the guildfx crowdsale factory

   - Function: `createCrowdSale`
   - guildToken: Address of you guild token
   - guildDao: Super Admin multisig vault
   - guildDev: Super Admin multisig vault
   - guildTreasury: Super Admin multisig vault
   - startingPrice: 7000000  (7 cents)
   - Execution Strategy: `Multisig`
     - Enter the Super Admin multisig vault
   - Proposal: `"blah, blah"`
   - Description: `"blah, blah"`
   - Nice work! This proposal should now be viewable in the "Active proposals" section of Defender.

5. Approve & execute the guild creation proposal
    
    - Wait for it to be confirmed

5. Get crowdsale contract address 

    - 🚨 Where will they get this from? (TODO)

6. Add the crowdsale to defender UI

    - Address: Address from step 5
    - ... other data
    - abi: 🚨 Where will they get this from? (TODO)

7. Whitelist the crowdsale to mint your GuildToken

    1. In Defender, navigate to your guild token 

    2. Create an admin action

    3. Fill in the whitelist params:

        - Function: `whitelistMint`

        - _mintAddress: Address of your `CrowdSale`

        - _isActive: true

        - Multisig execution strategy (with your Super Admin)

        - Describe the proposal...

8. Approve and execute the proposal

9. Your crowdsale is now ACTIVE ✅