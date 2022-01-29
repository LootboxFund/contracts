// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
import { ethers, upgrades, network } from "hardhat";
import { Constants, DAI, ETH, USDC, USDT, UST } from "../typechain";
import { logToFile } from "./helpers/logger";
import { stripZeros } from "../test/helpers/test-helpers";
import {
  TokenFragment,
  TokenFragsWithCDN,
  uploadTokenDataToCDN,
  uploadTokenIndexToCDN,
} from "./helpers/tokenlist";
import { Address, ChainIDHex } from "@guildfx/helpers";

const semvar = "0.0.1-sandbox";
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

const LOG_FILE_PATH = `${__dirname}/logs/deployGuildFactory_log_${Date.now()}.dev.txt`;

const ENVIRONMENT = "development";

const GUILD_TOKEN_NAME = "Artemis Guild";
const GUILD_TOKEN_SYMBOL = "ARTMS";

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
  const [
    deployer,
    treasury,
    dao,
    developer,
    purchaser,
    gfxStaff,
    guildDao,
    guildDev,
    guildTreasury,
  ] = await ethers.getSigners();
  const DEPLOYER_ADDRESS = deployer.address;
  logToFile(
    `
  
---------- DEPLOY GUILD FACTORY (development) ----------
  
Script starting

---- Network = ${network.name} (Decimal ID = ${network.config.chainId})

  \n`,
    LOG_FILE_PATH
  );
  logToFile(`Deployer Address =         ${DEPLOYER_ADDRESS} \n`, LOG_FILE_PATH);

  const tokenAddresses: Address[] = [];

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
  await uploadTokenDataToCDN({
    tokenFrag: { symbol: "ETH", address: ethStablecoin.address },
    chainIdHex: network.config.chainId?.toString(16) || "undefined",
    semvar,
    loggerPath: LOG_FILE_PATH,
  });
  tokenAddresses.push(ethStablecoin.address);
  logToFile(
    `ETH Stablecoin Address =             ${ethStablecoin.address} \n`,
    LOG_FILE_PATH
  );

  // Needed to slow down transactions to avoid "replacement fee too low" errors...
  await sleep();

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
  await uploadTokenDataToCDN({
    tokenFrag: { symbol: "USDC", address: usdcStablecoin.address },
    chainIdHex: network.config.chainId?.toString(16) || "undefined",
    semvar,
    loggerPath: LOG_FILE_PATH,
  });
  tokenAddresses.push(usdcStablecoin.address);
  logToFile(
    `USDC Stablecoin Address =            ${usdcStablecoin.address} \n`,
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
  await uploadTokenDataToCDN({
    tokenFrag: { symbol: "USDT", address: usdtStablecoin.address },
    chainIdHex: network.config.chainId?.toString(16) || "undefined",
    semvar,
    loggerPath: LOG_FILE_PATH,
  });
  tokenAddresses.push(usdtStablecoin.address);
  logToFile(
    `USDT Stablecoin Address =            ${usdtStablecoin.address} \n`,
    LOG_FILE_PATH
  );

  // --------- Index the Stablecoins --------- //
  await uploadTokenIndexToCDN({
    addresses: tokenAddresses,
    chainIdHex: (network.config.chainId?.toString(16) ||
      "undefined") as ChainIDHex,
    semvar,
    loggerPath: LOG_FILE_PATH,
  });

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
    `Constants Token Address =            ${CONSTANTS_ADDRESS} \n`,
    LOG_FILE_PATH
  );
  await sleep();

  // --------- Sets Stable Coin Addresses --------- //
  await constants
    .connect(dao)
    .setCrowdSaleStableCoins(
      ethStablecoin.address,
      usdcStablecoin.address,
      usdtStablecoin.address
    );
  logToFile(`---------- Set Stablecoin Addresses ---------- \n`, LOG_FILE_PATH);
  await sleep();

  // --------- Set Stable Coin Price Feed Addresses --------- //
  await constants
    .connect(dao)
    .setOraclePriceFeeds(
      STABLECOINS[ENVIRONMENT].BNB.priceFeed,
      STABLECOINS[ENVIRONMENT].ETH.priceFeed,
      STABLECOINS[ENVIRONMENT].USDC.priceFeed,
      STABLECOINS[ENVIRONMENT].USDT.priceFeed
    );
  logToFile(`---------- Set Price Feed Addresses ---------- \n`, LOG_FILE_PATH);
  await sleep();

  // --------- Deploy Guild Factory --------- //
  const GuildFactory = await ethers.getContractFactory("GuildFactory");
  const guildFactory = await GuildFactory.deploy(
    dao.address,
    constants.address
  );
  await guildFactory.deployed();
  logToFile(
    `Guild Factory Contract Address =    ${guildFactory.address} \n`,
    LOG_FILE_PATH
  );
  await sleep();

  // --------- Authorize GFX Staff --------- //
  await guildFactory.connect(dao).whitelistGFXStaff(gfxStaff.address, true);

  // --------- Authorize a Guild Owner --------- //
  await guildFactory.connect(dao).whitelistGuildOwner(guildDao.address, true);

  // --------- Create the GuildToken --------- //
  const tx = await guildFactory
    .connect(guildDao)
    .createGuild(
      GUILD_TOKEN_NAME,
      GUILD_TOKEN_SYMBOL,
      guildDao.address,
      guildDev.address
    );

  await tx.wait();
  const [guildTokenAddress] = (await guildFactory.viewGuildTokens()).map(
    stripZeros
  );
  logToFile(
    `Guild Token Address =      ${guildTokenAddress} \n`,
    LOG_FILE_PATH
  );
  await sleep();

  // crowdsales are deployed later, in a separate script
  // because in real life, the guild will need time to think over their crowdsale parameters
  // such as crowdsale price, start and end dates, etc.
}

main().catch((error) => {
  logToFile(error.message, LOG_FILE_PATH);
  console.error(error);
  process.exitCode = 1;
});
