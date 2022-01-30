/**
 * Script to deploy the a GuildFX's CrowdsaleFactory contract
 *
 * Run this script as:
 * npm run deploy:testnet:crowdsale-factory
 * OR
 * npm run deploy:rinkeby:guild-factory (not yet configured)
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
 *
 * Note: Currently you can't call this script with args because of how it is called with hardhat.
 *       Due to this limitation, paramaters are hardcoded in the file.
 */

import { ethers, network } from "hardhat";
import { stripZeros } from "../test/helpers/test-helpers";
import { sleep } from "./helpers/helpers";
import { logToFile } from "./helpers/logger";
import { addresses } from "./constants";

const DEFAULT_GUILD_TOKEN_STARTING_PRICE = "7000000"; // 7 USD cents

const LOG_FILE_PATH = `${__dirname}/logs/${network.name}_${
  network.config.chainId
}-deployCrowdSaleFactory_log_${Date.now()}.dev.txt`;

async function main() {
  const chainId = network.config.chainId;

  if (!chainId) {
    throw new Error(
      "Chain ID cannot be undefined! Please specify the chain ID in hardhat.config.json"
    );
  }

  if (Object.keys(addresses).indexOf(`${chainId}`) === -1) {
    throw new Error(`Please update config for chain ID ${chainId}`);
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
  const {
    Oxnewton,
    Oxterran,
    gfxDAO,
    gfxDeveloper,
    gfxTreasury,
    gfxConstants,
  } = addresses[chainId];

  logToFile(
    ` 
  
---------- DEPLOY CROWDSALE FACTORY (development) ----------
  
---- Script starting...

---- Network:                             ${network.name} (Decimal ID = ${chainId})

---- 0xnewton:                            ${Oxnewton}

---- 0xterran:                            ${Oxterran}

---- GuildFX DAO (multisig):              ${gfxDAO}

---- GuildFX Treasury (multisig):         ${gfxTreasury}

---- GuildFX Dev (multisig):              ${gfxDeveloper}

---- Deployer (UNTRUSTED):                ${__untrustedDeployer.address}

---- Temporary GuildFX DAO (UNTRUSTED):   ${__untrustedGFXDAO.address}

---- Purchaser (UNTRUSTED):               ${__untrustedPurchaser.address}

  \n`,
    LOG_FILE_PATH
  );

  // --------- Deploy CrowdSale Factory --------- //
  const CrowdSaleFactory = await ethers.getContractFactory("CrowdSaleFactory");
  const crowdSaleFactory = await CrowdSaleFactory.deploy(gfxDAO, gfxConstants);
  await crowdSaleFactory.deployed();
  logToFile(
    `---- ${crowdSaleFactory.address} ---> Crowsale Factory Contract Address\n`,
    LOG_FILE_PATH
  );
  await sleep();

  // --------- Authorize GFX Staff --------- //
  const txWhitelistGFXStaff = await crowdSaleFactory
    .connect(dao)
    .whitelistGFXStaff(gfxStaff.address, true);

  await txWhitelistGFXStaff.wait();

  logToFile(
    `---- ${gfxStaff.address} ---> Whitelisted GuildFX staff \n`,
    LOG_FILE_PATH
  );

  // --------- Authorize a Guild Owner --------- //
  const txWhitelistGuildOwner = await crowdSaleFactory
    .connect(gfxStaff)
    .whitelistGuildOwner(guildDao.address, true);

  await txWhitelistGuildOwner.wait();

  logToFile(
    `---- ${guildDao.address} ---> Whitelisted guild's DAO \n`,
    LOG_FILE_PATH
  );
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  logToFile(error.message, LOG_FILE_PATH);
  console.error(error);
  process.exitCode = 1;
});
