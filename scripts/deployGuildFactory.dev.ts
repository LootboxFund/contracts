// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers, upgrades } from "hardhat";
import { Constants, DAI, ETH, USDC, USDT, UST } from "../typechain";
import { logToFile } from "./helpers/logger";
import { stripZeros } from "../test/helpers/test-helpers";

const Oxnewton = "0xaC15B26acF4334a62961237a0DCEC90eDFE1B251";
const Oxterran = "0x26dE296ff2DF4eA26aB688B8680531D2B1Bb461F";

// Needed to slow down transactions to avoid "replacement fee too low" errors...
const sleep = async (ms = 1000) => {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
};

const STARTING_GUILD_PRICE_IN_USD = ethers.BigNumber.from('7000000');
const LOG_FILE_PATH = `${__dirname}/logs/deployGuildFactory_log_${Date.now()}.dev.txt`;

const ENVIRONMENT = "development";

const GUILD_TOKEN_NAME = "GuildFX";
const GUILD_TOKEN_SYMBOL = "GUILD";

// Chainlink addresses from https://docs.chain.link/docs/binance-smart-chain-addresses
const STABLECOINS = {
  development: {
    BNB: {
      priceFeed: "0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526",
    },
    ETH: {
      priceFeed: "0x143db3CEEfbdfe5631aDD3E50f7614B6ba708BA7",
    },
    DAI: {
      priceFeed: "0xE4eE17114774713d2De0eC0f035d4F7665fc025D",
    },
    USDC: {
      priceFeed: "0x90c069C4538adAc136E051052E14c1cD799C41B7",
    },
    USDT: {
      priceFeed: "0xEca2605f0BCF2BA5966372C99837b1F182d3D620",
    },
    UST: {
      priceFeed: "0xEca2605f0BCF2BA5966372C99837b1F182d3D620", // Note: chainlink does not have UST on testnet, using USDT for now
    },
  },
};

async function main() {
  const [deployer, treasury, dao, developer, purchaser] =
    await ethers.getSigners();
  const DEPLOYER_ADDRESS = deployer.address;
  logToFile(
    `
  
---------- DEPLOY GUILD FACTORY (development) ----------
  
---- Script starting

  \n`,
    LOG_FILE_PATH
  );
  logToFile(`---- ${DEPLOYER_ADDRESS} ---> Deployer Address \n`, LOG_FILE_PATH);

  // --------- Deploy the Stablecoins --------- //
  const Eth = await ethers.getContractFactory("ETH");
  const ethStablecoin = (await Eth.deploy(0)) as ETH;
  await sleep();
  await ethStablecoin.mint(
    purchaser.address,
    ethers.BigNumber.from("100000000000000000000")
  );
  await sleep();
  await ethStablecoin.mint(
    Oxnewton,
    ethers.BigNumber.from("100000000000000000000")
  );
  await sleep();
  await ethStablecoin.mint(
    Oxterran,
    ethers.BigNumber.from("100000000000000000000")
  );
  await sleep();
  logToFile(
    `---- ${ethStablecoin.address} ---> ETH Stablecoin Address\n`,
    LOG_FILE_PATH
  );

  // Needed to slow down transactions to avoid "replacement fee too low" errors...
  await new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, 1000);
  });

  const Usdc = await ethers.getContractFactory("USDC");
  const usdcStablecoin = (await Usdc.deploy(0)) as USDC;
  await sleep();
  await usdcStablecoin.mint(
    purchaser.address,
    ethers.BigNumber.from("100000000000000000000")
  );
  await sleep();
  await usdcStablecoin.mint(
    Oxnewton,
    ethers.BigNumber.from("100000000000000000000")
  );
  await sleep();
  await usdcStablecoin.mint(
    Oxterran,
    ethers.BigNumber.from("100000000000000000000")
  );
  await sleep();
  logToFile(
    `---- ${usdcStablecoin.address} ---> USDC Stablecoin Address\n`,
    LOG_FILE_PATH
  );

  const Usdt = await ethers.getContractFactory("USDT");
  const usdtStablecoin = (await Usdt.deploy(0)) as USDT;
  await sleep();
  await usdtStablecoin.mint(
    purchaser.address,
    ethers.BigNumber.from("100000000000000000000")
  );
  await sleep();
  await usdtStablecoin.mint(
    Oxnewton,
    ethers.BigNumber.from("100000000000000000000")
  );
  await sleep();
  await usdtStablecoin.mint(
    Oxterran,
    ethers.BigNumber.from("100000000000000000000")
  );
  await sleep();
  logToFile(
    `---- ${usdtStablecoin.address} ---> USDT Stablecoin Address\n`,
    LOG_FILE_PATH
  );

  const Ust = await ethers.getContractFactory("UST");
  const ustStablecoin = (await Ust.deploy(0)) as UST;
  await sleep();
  await ustStablecoin.mint(
    purchaser.address,
    ethers.BigNumber.from("100000000000000000000")
  );
  await sleep();
  await ustStablecoin.mint(
    Oxnewton,
    ethers.BigNumber.from("100000000000000000000")
  );
  await sleep();
  await ustStablecoin.mint(
    Oxterran,
    ethers.BigNumber.from("100000000000000000000")
  );
  await sleep();
  logToFile(
    `---- ${ustStablecoin.address} ---> UST Stablecoin Address\n`,
    LOG_FILE_PATH
  );

  const Dai = await ethers.getContractFactory("DAI");
  const daiStablecoin = (await Dai.deploy(0)) as DAI;
  await sleep();
  await daiStablecoin.mint(
    purchaser.address,
    ethers.BigNumber.from("100000000000000000000")
  );
  await sleep();
  await daiStablecoin.mint(
    Oxnewton,
    ethers.BigNumber.from("100000000000000000000")
  );
  await sleep();
  await daiStablecoin.mint(
    Oxterran,
    ethers.BigNumber.from("100000000000000000000")
  );
  await sleep();
  logToFile(
    `---- ${daiStablecoin.address} ---> DAI Stablecoin Address\n`,
    LOG_FILE_PATH
  );

  // --------- Deploy Constants Contract --------- //
  const Constants = await ethers.getContractFactory("Constants");
  const constants = (await upgrades.deployProxy(
    Constants,
    [dao.address, developer.address, treasury.address],
    {
      kind: "uups",
    }
  )) as Constants;
  await constants.deployed();
  const CONSTANTS_ADDRESS = constants.address;
  logToFile(
    `---- ${CONSTANTS_ADDRESS} ---> Constants Token Address\n`,
    LOG_FILE_PATH
  );
  await sleep();

  // --------- Sets Stable Coin Addresses --------- //
  await constants
    .connect(dao)
    .setCrowdSaleStableCoins(
      ethStablecoin.address,
      usdcStablecoin.address,
      usdtStablecoin.address,
      ustStablecoin.address,
      daiStablecoin.address
    );
  logToFile(
    `---------------------------------------------------> Set Stablecoin Addresses\n`,
    LOG_FILE_PATH
  );
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
  logToFile(
    `---------------------------------------------------> Set Stablecoin Price Feed Addresses\n`,
    LOG_FILE_PATH
  );
  await sleep();

  // --------- Deploy Guild Factory --------- //
  const GuildFactory = await ethers.getContractFactory("GuildFactory");
  const guildFactory = await GuildFactory.deploy(
    dao.address,
    constants.address
  );
  await guildFactory.deployed();
  logToFile(
    `---- ${guildFactory.address} ---> Guild Factory Contract Address\n`,
    LOG_FILE_PATH
  );
  await sleep();

  // --------- Create the GuildToken and Crowdsale --------- //
  const tx = await guildFactory.createGuildWithCrowdSale(
    GUILD_TOKEN_NAME,
    GUILD_TOKEN_SYMBOL,
    dao.address,
    developer.address,
    treasury.address,
    STARTING_GUILD_PRICE_IN_USD
  );

  await tx.wait();
  const [guildTokenAddress] = (await guildFactory.viewGuildTokens()).map(
    stripZeros
  );
  const [crowdsaleAddress] = (await guildFactory.viewGuildTokens()).map(
    stripZeros
  );
  logToFile(
    `---- ${guildTokenAddress} ---> Guild Token Address\n`,
    LOG_FILE_PATH
  );
  logToFile(`---- ${crowdsaleAddress} ---> Crowdsale Address\n`, LOG_FILE_PATH);
  await sleep();

  // --------- Whitelist the CrowdSale with MINTER_ROLE --------- //
  const guildToken = (await ethers.getContractFactory("GuildToken")).attach(
    guildTokenAddress
  );

  (await guildToken.connect(dao).whitelistMint(crowdsaleAddress, true)).wait();

  logToFile(
    `
    ---- Whitelist a mint!
    Crowdsale = ${crowdsaleAddress}
  \n`,
    LOG_FILE_PATH
  );
  await sleep();
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  logToFile(error.message, LOG_FILE_PATH);
  console.error(error);
  process.exitCode = 1;
});