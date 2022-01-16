// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers, upgrades } from "hardhat";
import { DEVELOPER_ROLE } from "../test/helpers/test-helpers";

// $0.07 = 7*10^6
const STARTING_GUILD_PRICE_IN_USD_CENTS = 7;

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

  // --------- Deploy GUILD Token --------- //
  const GuildToken = await ethers.getContractFactory("GuildToken");
  const guildtoken = await upgrades.deployProxy(GuildToken, { kind: "uups" });
  await guildtoken.deployed();
  console.log(
    `✅ Deployed Guild Token at contract address ${guildtoken.address}`
  );
  await sleep();
  const GUILD_TOKEN_ADDRESS = guildtoken.address;
  const GUILD = await GuildToken.attach(GUILD_TOKEN_ADDRESS);
  console.log(`---- ${GUILD_TOKEN_ADDRESS} ---> GUILD Token Address`);
  (
    await GUILD.transferOwnershipToDAO(DEPLOYER_ADDRESS, DEPLOYER_ADDRESS)
  ).wait();
  console.log(
    `✅ Transfer ownership to DAO = ${DEPLOYER_ADDRESS} and DEV = ${DEVELOPER_ROLE}`
  );
  await sleep();

  // --------- Deploy the Crowdsale --------- //
  const Crowdsale = await ethers.getContractFactory("CrowdSale");
  const crowdsale = await upgrades.deployProxy(
    Crowdsale,
    [
      GUILD_TOKEN_ADDRESS,
      DEPLOYER_ADDRESS,
      DEPLOYER_ADDRESS,
      treasury.address,
      STARTING_GUILD_PRICE_IN_USD_CENTS,
    ],
    { kind: "uups" }
  );
  await crowdsale.deployed();
  console.log(`✅ Deployed Crowdsale at ${crowdsale.address}`);
  await sleep();
  const CROWDSALE_ADDRESS = crowdsale.address;
  const CROWDSALE = await Crowdsale.attach(CROWDSALE_ADDRESS);
  console.log(`---- ${CROWDSALE_ADDRESS} ---> GUILD Crowdsale Address`);
  (
    await CROWDSALE.setStablecoins(
      STABLECOINS[ENVIRONMENT].ETH.address,
      STABLECOINS[ENVIRONMENT].USDC.address,
      STABLECOINS[ENVIRONMENT].USDT.address,
      STABLECOINS[ENVIRONMENT].UST.address,
      STABLECOINS[ENVIRONMENT].DAI.address
    )
  ).wait();
  console.log(`✅ Set the stablecoins`);
  await sleep();
  (
    await CROWDSALE.setOracles(
      STABLECOINS[ENVIRONMENT].BNB.priceFeed,
      STABLECOINS[ENVIRONMENT].ETH.priceFeed,
      STABLECOINS[ENVIRONMENT].USDC.priceFeed,
      STABLECOINS[ENVIRONMENT].USDT.priceFeed,
      STABLECOINS[ENVIRONMENT].UST.priceFeed,
      STABLECOINS[ENVIRONMENT].DAI.priceFeed
    )
  ).wait();
  await sleep();
  console.log(`✅ Set the oracles`);

  // --------- Whitelist the CrowdSale with MINTER_ROLE --------- //
  (await GUILD.whitelistMint(crowdsale.address, true)).wait();
  console.log(`✅ Whitelisted the Mint`);
  await sleep();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
