/**
 * Script to deploy the GuildFX's GuildFactory contract (as well as the Constants contract)
 *
 * Run this script as:
 * npm run deploy:testnet:guild-factory
 * OR
 * npm run deploy:rinkeby:guild-factory
 *
 * After running this script, there are a few steps the GuildFX admins need to do in order to get Guilds onboarded:
 * 1. [OPTIONAL as the DAO should already have GFX_STAFF permissions] call .GuildFactory.sol `.whitelistGFXStaff()` function
 * 2. The GFX Staff needs to then call guildFactory `.whitelistGuildOwner()`, function to enable a guild to create a token
 * 3. The guild owner will call guildFactory `.createGuild()` to deploy their token
 * 4. Later on, the guild owner will call crowdsaleFactory `.createCrowdSale()` function via DEFENDER to make a crowdsale
 *
 * ... please README.md for more info.
 *
 * IMPORTANT: Our hardhat config uses "untrusted" signers with a single private key.
 *            However, we have "trusted" guild fx accounts which are secure multisigs created in Openzeppelin Defender.
 *            Thus, we prefix the untrusted accounts with "__untrusted" in these scripts. The trusted multisigs are currently
 *            configured in { addresses } from ./constants. Please read the ../README.md for more details.
 */

import { ethers, upgrades, network } from "hardhat";
import { Constants, ETH, USDC, USDT } from "../typechain";
import { logToFile } from "./helpers/logger";
import {
  uploadTokenDataToCDN,
  uploadTokenIndexToCDN,
} from "./helpers/tokenlist";
import { Address, ChainIDHex } from "@guildfx/helpers";
import { addresses, STABLECOINS } from "./constants";

const semvar = "0.0.1-sandbox";

// Needed to slow down transactions to avoid "replacement fee too low" errors...
const sleep = async (ms = 1000) => {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
};

const LOG_FILE_PATH = `${__dirname}/logs/${network.name}_${
  network.config.chainId
}-deployGuildFactory_log_${Date.now()}.dev.txt`;

const ENVIRONMENT = "development";

async function main() {
  const chainId = network.config.chainId;

  if (!chainId) {
    throw new Error(
      "Chain ID cannot be undefined! Please specify the chain ID in hardhat.config.json"
    );
  }

  if (Object.keys(addresses).indexOf(`${chainId}`) === -1) {
    throw new Error(
      `Please update config: "$addresses" for chain ID ${chainId}`
    );
  }

  if (Object.keys(STABLECOINS).indexOf(`${chainId}`) === -1) {
    throw new Error(
      `Please update config: "$STABLECOINS" for chain ID ${chainId}`
    );
  }

  /**
   * IMPORTANT: Our hardhat config uses "untrusted" signers with a single private key.
   *            However, we have "trusted" guild fx accounts which are secure multisigs created in Openzeppelin Defender.
   *            Thus, we prefix the untrusted accounts with "__untrusted" in these scripts. The trusted multisigs are currently
   *            configured in { addresses } from ./constants. Please read the ../README.md for more details.
   */
  const [
    __untrustedDeployer,
    __untrustedTreasury,
    __untrustedGFXDAO,
    __untrustedGFXDeveloper,
    __untrustedPurchaser,
  ] = await ethers.getSigners();

  // Trusted GuildFX multisigs (see note above):
  const { Oxnewton, Oxterran, gfxDAO, gfxDeveloper, gfxTreasury } =
    addresses[chainId];

  logToFile(
    `
  
---------- DEPLOY GUILD FACTORY (development) ----------
  
Script starting

---- Network = ${network.name} (Decimal ID = ${chainId})

  \n`,
    LOG_FILE_PATH
  );
  logToFile(
    `Deployer Address =         ${__untrustedDeployer.address} \n`,
    LOG_FILE_PATH
  );

  const tokenAddresses: Address[] = [];

  // --------- Deploy the Stablecoins --------- //
  const Eth = await ethers.getContractFactory("ETH");
  const ethStablecoin = (await Eth.deploy(0)) as ETH;
  await sleep();
  await ethStablecoin.mint(
    __untrustedPurchaser.address,
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
    chainIdHex: chainId?.toString(16) || "undefined",
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
    __untrustedPurchaser.address,
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
    chainIdHex: chainId?.toString(16) || "undefined",
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
    __untrustedPurchaser.address,
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
    chainIdHex: chainId?.toString(16) || "undefined",
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
    chainIdHex: (chainId?.toString(16) || "undefined") as ChainIDHex,
    semvar,
    loggerPath: LOG_FILE_PATH,
  });

  // --------- Deploy Constants Contract --------- //
  const Constants = await ethers.getContractFactory("Constants");
  const constants = (await upgrades.deployProxy(
    Constants,
    // NOTE: we use __untrustedGFXDAO as temporary DAO.
    // We call constants.sol .transferGuildFXDAOAdminPrivileges() method later
    // to transfer the DAO ownership to the trusted multisig wallets
    [__untrustedGFXDAO.address, gfxDeveloper, gfxTreasury],
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
    .connect(__untrustedGFXDAO)
    .setCrowdSaleStableCoins(
      ethStablecoin.address,
      usdcStablecoin.address,
      usdtStablecoin.address
    );
  logToFile(`---------- Set Stablecoin Addresses ---------- \n`, LOG_FILE_PATH);
  await sleep();

  // --------- Set Stable Coin Price Feed Addresses --------- //
  await constants
    .connect(__untrustedGFXDAO)
    .setOraclePriceFeeds(
      STABLECOINS[chainId].BNB.priceFeed,
      STABLECOINS[chainId].ETH.priceFeed,
      STABLECOINS[chainId].USDC.priceFeed,
      STABLECOINS[chainId].USDT.priceFeed
    );
  logToFile(`---------- Set Price Feed Addresses ---------- \n`, LOG_FILE_PATH);
  await sleep();

  // --------- 🚨 IMPORTANT 🚨 Transfer Constants DAO ownership to the secure GuildFX multisig --------- //
  await constants
    .connect(__untrustedGFXDAO)
    .transferGuildFXDAOAdminPrivileges(gfxDAO);

  logToFile(
    `---- ${gfxDAO} --->  Transfered GuildFX DAO role for Constants Contract \n`,
    LOG_FILE_PATH
  );
  await sleep();

  // --------- Deploy Guild Factory --------- //
  const GuildFactory = await ethers.getContractFactory("GuildFactory");
  const guildFactory = await GuildFactory.deploy(gfxDAO, constants.address);
  await guildFactory.deployed();
  logToFile(
    `Guild Factory Contract Address =    ${guildFactory.address} \n`,
    LOG_FILE_PATH
  );
  await sleep();
}

main().catch((error) => {
  logToFile(error.message, LOG_FILE_PATH);
  console.error(error);
  process.exitCode = 1;
});
