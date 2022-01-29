# Deployment

## Development

0. 📦 Set up 3 guildDaos registered in Firestore
    i. 📦 Create record in Firestore/guilds with `firestoreGuilds.deploy`
    ii. 📦 Create record in Webflow/guilds with `webflowGuilds.deploy`
1. ✅ Run the `GuildFactory.deploy` script. Sync semvar.
    i. ✅ Deploy the mock stablecoins. JSON data uploaded to GBucket/tokens for WidgetsFE
    i. ✅ Deploy `Constants.sol`. Set the stablecoins & price feeds.
    ii. ✅ Deploy `GuildFactory.sol`. Authorize gfxStaff
2. 📦 Attach Moralis event listeners on `GuildFactory` for creation of guilds. Sync semvar.
    i. 📦 Deploy Moralis CloudFn `GuildFactory.createGuild.listener()`
    ii. 📦 Listener uploads guild token JSON data to GBucket/tokens for WidgetsFE.
    iii. 📦 Update the GBucket/tokens/index.json for WidgetsFE
3. 📦 Run the `GuildCreation.mock` script. Sync semvar.
    i. 📦 Use gfxStaff to authorize a list of 3 guildDaos. Update in Firestore/guilds
    ii. 📦 Call `GuildFactory.createGuild()` as 3 guildDaos to create a guild token. Update in Firestore/guilds
    iii. 📦 Moralis listeners upload JSON data to GBucket/tokens for WidgetsFE
4. 📦 Run the `CrowdSale.deploy` script. Sync semvar.
    i. 📦 Copy over the addresses for `Constants.sol` and the 3 `GuildToken.sol` (see .txt logs)
    ii. 📦 Deploy `CrowdSaleFactory.sol`
    iii. 📦 Whitelist gfxStaff so they can whitelist 3 guildDaos to call `CrowdSaleFactory.createCrowdSale()`. Update in Firestore/guilds
    iv. 📦 Create 3 crowdsales as the 3 guildDaos. Update Firestore/crowdsales & Webflow/crowdsales
    v. 📦 Moralis listeners upload JSON data to GBucket/crowdsales for WidgetsFE
5. 📦 Attach Moralis event listerners on `CrowdSaleFactory` for creation of crowdsales. Sync semvar.
    i. 📦 Deploy Moralis CloudFn `CrowdSaleFactory.createCrowdSale.listener()`
    ii. 📦 Listener uploads crowdsale JSON data to GBucket/crowdsales for WidgetsFE.
    iii. 📦 Update the GBucket/crowdsales/index.json for WidgetsFE
6. 📦 Deploy `@guildfx/widgets` to WidgetsFE
    i. 📦 Deploy to correct semvar version that matches GBucket folder for token JSON data.
    ii. 📦 Load widgets on Storybook and playtest
    iii. 📦 Load widgets on Webflow and playtest

## Production



## Scaling Event Listeners

To scale event listeners, each guild must register their own Moralis account and add the event listeners to their smart contracts. It would be nice to hook it up to Twitter or email, but for now we can call it pub()

1. 📦 Guild initializes token
    i. 📦 Gets whitelisted to use make a guild token
    ii. 📦 guildDao calls `GuildFactory.createGuild()` and gets token contract address
2. 📦 Guild registers for Moralis
    i. 📦 Add Moralis event listeners for their `GuildToken.sol`: minting, acl, etc
    ii. 📦 Add event listeners to their manual testing checklist
3. 📦 Guild initializes crowdsale
    i. 📦 Gets whitelisted to make a crowdsale
    ii. 📦 guildDao calls `CrowdSaleFactory.createCrowdSale()` and gets crowdsale contract address
    iii. 📦 Add Moralis event listeners for their `CrowdSale.sol`: purchase, et
4. 📦 GuildFX webhook captures guild events
    i. 📦 Saves event data into GCloud/guild_events
    ii. 📦 Updates state data in Firestore/guild