// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers, upgrades } from "hardhat";

// $0.07 = 7*10^6
const STARTING_GUILD_PRICE_IN_USD = ethers.BigNumber.from("7000000"); // ~0.07 USD in 18 decimals

const STABLECOINS = {
  production: {
    BNB: {
      address: "",
      priceFeed: "0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE",
    },
    ETH: {
      address: "0x2170ed0880ac9a755fd29b2688956bd959f933f8",
      priceFeed: "0x9ef1B8c0E4F7dc8bF5719Ea496883DC6401d5b2e",
    },
    DAI: {
      address: "0x1af3f329e8be154074d8769d1ffa4ee058b1dbc3",
      priceFeed: "0x132d3C0B1D2cEa0BC552588063bdBb210FDeecfA",
    },
    USDC: {
      address: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d",
      priceFeed: "0x51597f405303C4377E36123cBc172b13269EA163",
    },
    USDT: {
      address: "0x55d398326f99059ff775485246999027b3197955",
      priceFeed: "0xB97Ad0E74fa7d920791E90258A6E2085088b4320",
    },
    UST: {
      address: "0x23396cf899ca06c4472205fc903bdb4de249d6fc",
      priceFeed: "0xcbf8518F8727B8582B22837403cDabc53463D462",
    },
  },
};

const ENVIRONMENT = "production";

const GUILD_TOKEN_NAME = "GuildFX";
const GUILD_TOKEN_SYMBOL = "GUILD";

// Needed to slow down transactions to avoid "replacement fee too low" errors...
const sleep = async (ms = 1000) => {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
};

async function main() {
  const [deployer, treasury, dao, developer, purchaser] =
    await ethers.getSigners();
  console.log(`
  
  ---- deployer = ${deployer.address}
  ---- treasury = ${treasury.address}
  ---- dao = ${dao.address}
  ---- developer = ${developer.address}
  ---- purchaser = ${purchaser.address}
  
  `);
  const DEPLOYER_ADDRESS = deployer.address;
  console.log(`---- ${DEPLOYER_ADDRESS} ---> Deployer Address`);

  // --------- Deploy Constants Contract --------- //
  const Constants = await ethers.getContractFactory("Constants");
  const constants = await upgrades.deployProxy(
    Constants,
    [dao.address, developer.address, treasury.address],
    {
      kind: "uups",
    }
  );
  await constants.deployed();
  const CONSTANTS_ADDRESS = constants.address;
  console.log(`✅ Deployed Constants Contract ${CONSTANTS_ADDRESS}`);
  await sleep();

  // --------- Sets Stable Coin Addresses --------- //
  await constants
    .connect(dao)
    .setCrowdSaleStableCoins(
      STABLECOINS[ENVIRONMENT].ETH.address,
      STABLECOINS[ENVIRONMENT].USDC.address,
      STABLECOINS[ENVIRONMENT].USDT.address,
      STABLECOINS[ENVIRONMENT].UST.address,
      STABLECOINS[ENVIRONMENT].UST.address
    );
  console.log(`✅ Set Stablecoin Addresses`);
  await sleep();

  // --------- Set Stable Coin Price Feed Addresses --------- //
  await constants
    .connect(dao)
    .setOraclePriceFeeds(
      STABLECOINS[ENVIRONMENT].BNB.priceFeed,
      STABLECOINS[ENVIRONMENT].ETH.priceFeed,
      STABLECOINS[ENVIRONMENT].USDC.priceFeed,
      STABLECOINS[ENVIRONMENT].USDT.priceFeed,
      STABLECOINS[ENVIRONMENT].UST.priceFeed,
      STABLECOINS[ENVIRONMENT].UST.priceFeed
    );
  console.log(`✅ Set Stablecoin Price Feed Addresses`);
  await sleep();

  // --------- Deploy GUILD Token --------- //
  const GuildToken = await ethers.getContractFactory("GuildToken");
  const guildtoken = await upgrades.deployProxy(
    GuildToken,
    [GUILD_TOKEN_NAME, GUILD_TOKEN_SYMBOL, dao.address, developer.address],
    { kind: "uups" }
  );
  await guildtoken.deployed();
  console.log(
    `✅ Deployed Guild Token at contract address ${guildtoken.address}`
  );
  const GUILD_TOKEN_ADDRESS = guildtoken.address;
  const GUILD = await GuildToken.attach(GUILD_TOKEN_ADDRESS);
  console.log(`---- ${GUILD_TOKEN_ADDRESS} ---> GUILD Token Address`);
  await sleep();

  // --------- Deploy the Crowdsale --------- //
  const Crowdsale = await ethers.getContractFactory("CrowdSale");
  const crowdsale = await upgrades.deployProxy(
    Crowdsale,
    [
      GUILD_TOKEN_ADDRESS,
      DEPLOYER_ADDRESS,
      DEPLOYER_ADDRESS,
      CONSTANTS_ADDRESS,
      treasury.address,
      STARTING_GUILD_PRICE_IN_USD,
    ],
    { kind: "uups" }
  );
  await crowdsale.deployed();
  console.log(`✅ Deployed Crowdsale at ${crowdsale.address}`);
  await sleep();
  const CROWDSALE_ADDRESS = crowdsale.address;
  const CROWDSALE = await Crowdsale.attach(CROWDSALE_ADDRESS);
  console.log(`---- ${CROWDSALE_ADDRESS} ---> GUILD Crowdsale Address`);

  // --------- Whitelist the CrowdSale with MINTER_ROLE --------- //
  (await GUILD.connect(dao).whitelistMint(crowdsale.address, true)).wait();
  console.log(`✅ Whitelisted the Mint`);
  await sleep();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
