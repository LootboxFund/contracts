/**
 * Script to deploy the GuildFX's GuildFactory contract (as well as the Constants contract)
 *
 * Run this script as:
 * npm run deploy:testnet:guild-factory
 * OR
 * npm run deploy:rinkeby:guild-factory
 *
 * After running this script, only interact with the contracts via Openzeppelin Defender
 * 1. GuildFX DAO to call .GuildFactory.sol `.whitelistGFXStaff()` function [OPTIONAL as the DAO should already have GFX_STAFF permissions and can whitelist themselves]
 *      - Do this in Openzeppelin Defender
 * 2. The GFX Staff needs to then call guildFactory `.whitelistGuildOwner()`, function to enable a guild to create a token
 *      - Do this in Openzeppelin Defender
 * 3. The guild owner will call guildFactory `.createGuild()` to deploy their token
 *      - Do this in Openzeppelin Defender
 * 4. Later on, the guild owner will call crowdsaleFactory `.createCrowdSale()` function via DEFENDER to make a crowdsale
 *      - Do this in Openzeppelin Defender
 * 5. The Guild owner will also need to whitelist the crowdsale on their GuildToken.sol
 *      - Do this in Openzeppelin Defender
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
import { Address } from "@guildfx/helpers";
import { addresses, STABLECOINS, CURRENT_SEMVER } from "./constants";

const chainIdHex = `0x${network.config.chainId?.toString(16)}`;

const LOG_FILE_PATH = `${__dirname}/logs/${
  network.name
}_${chainIdHex}-deployGuildFactory_log_${Date.now()}.dev.txt`;

// Needed to slow down transactions to avoid "replacement fee too low" errors...
const sleep = async (ms = 1000) => {
  return new Promise<void>((resolve) => {
    setTimeout(() => {
      resolve();
    }, ms);
  });
};

async function main() {
  if (!chainIdHex) {
    throw new Error(
      "Chain ID cannot be undefined! Please specify the chain ID in hardhat.config.json"
    );
  }

  if (Object.keys(addresses).indexOf(chainIdHex) === -1) {
    throw new Error(
      `Please update config.addresses for chain ID ${chainIdHex}`
    );
  }

  if (Object.keys(STABLECOINS).indexOf(chainIdHex) === -1) {
    throw new Error(
      `Please update config.STABLECOINS for chain ID ${chainIdHex}`
    );
  }

  /**
   * IMPORTANT: Our hardhat config uses "untrusted" signers with a single private key.
   *            However, we have "trusted" guild fx accounts which are secure multisigs created in Openzeppelin Defender.
   *            Thus, we prefix the untrusted accounts with "__untrusted" in these scripts. The trusted multisigs are currently
   *            configured in { addresses } from ./constants. Please read the ../README.md for more details.
   */
  const [__untrustedDeployer, _, __untrustedGFXDAO, __, __untrustedPurchaser] =
    await ethers.getSigners();

  // GuildFX multisigs / contracts / addresses (see note above):
  const {
    Oxnewton,
    Oxterran,
    gfxDAO,
    gfxDeveloper,
    gfxTreasury,
    crimson,
    cana,
    mklion,
  } = addresses[chainIdHex];

  logToFile(
    `
  
---------- DEPLOY GUILD FACTORY (development) ----------

---- Script starting

---- Network:                             ${network.name} (Hex ID = ${chainIdHex}, Decimal ID = ${network.config.chainId})

---- 0xnewton:                            ${Oxnewton}

---- 0xterran:                            ${Oxterran}

---- Crimson:                             ${crimson}

---- Cana:                                ${cana}

---- GuildFX DAO (multisig):              ${gfxDAO}

---- GuildFX Treasury (multisig):         ${gfxTreasury}

---- GuildFX Dev (multisig):              ${gfxDeveloper}

---- Deployer (UNTRUSTED):                ${__untrustedDeployer.address}

---- Temporary GuildFX DAO (UNTRUSTED):   ${__untrustedGFXDAO.address}

---- Purchaser (UNTRUSTED):               ${__untrustedPurchaser.address}

  \n`,
    LOG_FILE_PATH
  );
  const tokenAddresses: Address[] = [];

  const stableCoinInitialMintAmount = ethers.BigNumber.from(
    "10000000000000000000000"
  ); // 10,000 coins

  // --------- Deploy the Stablecoins --------- //
  const Eth = await ethers.getContractFactory("ETH");
  const ethStablecoin = (await Eth.deploy(0)) as ETH;
  await sleep();
  await ethStablecoin.mint(
    __untrustedPurchaser.address,
    stableCoinInitialMintAmount
  );
  await sleep();
  await ethStablecoin.mint(Oxnewton, stableCoinInitialMintAmount);
  await sleep();
  await ethStablecoin.mint(Oxterran, stableCoinInitialMintAmount);
  await sleep();
  await ethStablecoin.mint(crimson, stableCoinInitialMintAmount);
  await sleep();
  await ethStablecoin.mint(cana, stableCoinInitialMintAmount);
  await sleep();
  await ethStablecoin.mint(mklion, stableCoinInitialMintAmount);
  await sleep();
  await uploadTokenDataToCDN({
    tokenFrag: { symbol: "ETH", address: ethStablecoin.address },
    chainIdHex,
    semver: CURRENT_SEMVER,
    loggerPath: LOG_FILE_PATH,
  });
  tokenAddresses.push(ethStablecoin.address);
  logToFile(
    `ETH Stablecoin Address = ${ethStablecoin.address} \n`,
    LOG_FILE_PATH
  );

  // Needed to slow down transactions to avoid "replacement fee too low" errors...
  await sleep();

  const Usdc = await ethers.getContractFactory("USDC");
  const usdcStablecoin = (await Usdc.deploy(0)) as USDC;
  await sleep();
  await usdcStablecoin.mint(
    __untrustedPurchaser.address,
    stableCoinInitialMintAmount
  );
  await sleep();
  await usdcStablecoin.mint(Oxnewton, stableCoinInitialMintAmount);
  await sleep();
  await usdcStablecoin.mint(Oxterran, stableCoinInitialMintAmount);
  await sleep();
  await usdcStablecoin.mint(crimson, stableCoinInitialMintAmount);
  await sleep();
  await usdcStablecoin.mint(cana, stableCoinInitialMintAmount);
  await sleep();
  await usdcStablecoin.mint(mklion, stableCoinInitialMintAmount);
  await sleep();
  await uploadTokenDataToCDN({
    tokenFrag: { symbol: "USDC", address: usdcStablecoin.address },
    chainIdHex,
    semver: CURRENT_SEMVER,
    loggerPath: LOG_FILE_PATH,
  });
  tokenAddresses.push(usdcStablecoin.address);
  logToFile(
    `USDC Stablecoin Address = ${usdcStablecoin.address} \n`,
    LOG_FILE_PATH
  );

  const Usdt = await ethers.getContractFactory("USDT");
  const usdtStablecoin = (await Usdt.deploy(0)) as USDT;
  await sleep();
  await usdtStablecoin.mint(
    __untrustedPurchaser.address,
    stableCoinInitialMintAmount
  );
  await sleep();
  await usdtStablecoin.mint(Oxnewton, stableCoinInitialMintAmount);
  await sleep();
  await usdtStablecoin.mint(Oxterran, stableCoinInitialMintAmount);
  await sleep();
  await usdtStablecoin.mint(crimson, stableCoinInitialMintAmount);
  await sleep();
  await usdtStablecoin.mint(cana, stableCoinInitialMintAmount);
  await sleep();
  await usdtStablecoin.mint(mklion, stableCoinInitialMintAmount);
  await sleep();
  await uploadTokenDataToCDN({
    tokenFrag: { symbol: "USDT", address: usdtStablecoin.address },
    chainIdHex,
    semver: CURRENT_SEMVER,
    loggerPath: LOG_FILE_PATH,
  });
  tokenAddresses.push(usdtStablecoin.address);
  logToFile(
    `USDT Stablecoin Address = ${usdtStablecoin.address} \n`,
    LOG_FILE_PATH
  );

  // --------- Index the Stablecoins --------- //
  await uploadTokenIndexToCDN({
    addresses: tokenAddresses,
    chainIdHex,
    semver: CURRENT_SEMVER,
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
    `GuildFX Constants Token Address = ${CONSTANTS_ADDRESS} \n`,
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
      STABLECOINS[chainIdHex].BNB.priceFeed,
      STABLECOINS[chainIdHex].ETH.priceFeed,
      STABLECOINS[chainIdHex].USDC.priceFeed,
      STABLECOINS[chainIdHex].USDT.priceFeed
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
    `Guild Factory Contract Address = ${guildFactory.address} \n`,
    LOG_FILE_PATH
  );
  await sleep();
}

main().catch((error) => {
  logToFile(error.message, LOG_FILE_PATH);
  console.error(error);
  process.exitCode = 1;
});
