/**
 * Script to deploy the a GuildFX's CrowdsaleFactory contract
 *
 * Run this script as:
 * npm run deploy:testnet:crowdsale-factory
 * OR
 * npm run deploy:rinkeby:guild-factory (not yet configured)
 *
 * After running this script, there are a few steps the GuildFX admins need to do in order to get Guilds onboarded:
 * 1. GuildFX DAO to call .crowdsaleFactory.sol `.whitelistGFXStaff()` function [OPTIONAL as the DAO should already have GFX_STAFF permissions and can whitelist themselves]
 *    to enable a GuildFX staff to manage the guilds.
 *      - Do this in Openzeppelin Defender
 * 2. The GFX Staff needs to then call crowdsaleFactory `.whitelistGuildOwner()`, function to enable a guild to create a token.
 *      - Do this Openzeppelin Defender
 * 3. The guild owner will call crowdsaleFactory.sol `.createCrowdSale()` to deploy their crowdsale
 *      - Do this Openzeppelin Defender
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
import { sleep } from "./helpers/helpers";
import { logToFile } from "./helpers/logger";
import { addresses } from "./constants";

const chainIdHex = network.config.chainId?.toString(16);

const LOG_FILE_PATH = `${__dirname}/logs/${network.name}_${
  network.config.chainId
}-deployCrowdSaleFactory_log_${Date.now()}.dev.txt`;

async function main() {
  if (!chainIdHex) {
    throw new Error(
      "Chain ID cannot be undefined! Please specify the chain ID in hardhat.config.json"
    );
  }

  if (Object.keys(addresses).indexOf(`${chainIdHex}`) === -1) {
    throw new Error(`Please update config for chain ID ${chainIdHex}`);
  }

  /**
   * IMPORTANT: Our hardhat config uses "untrusted" signers with a single private key.
   *            However, we have "trusted" guild fx accounts which are secure multisigs created in Openzeppelin Defender.
   *            Thus, we prefix the untrusted accounts with "__untrusted" in these scripts. The trusted multisigs are currently
   *            configured in { addresses } from ./constants. Please read the ../README.md for more details.
   */
  const [__untrustedDeployer] = await ethers.getSigners();

  // GuildFX multisigs / contracts / addresses (see note above):
  const { gfxDAO, gfxConstants } = addresses[chainIdHex];

  logToFile(
    ` 
  
---------- DEPLOY CROWDSALE FACTORY (development) ----------
  
---- Script starting...

---- Network:                             ${network.name} (Decimal ID = ${chainIdHex})

---- GuildFX DAO (multisig):              ${gfxDAO}

---- Deployer (UNTRUSTED):                ${__untrustedDeployer.address}

  \n`,
    LOG_FILE_PATH
  );

  // --------- Deploy CrowdSale Factory --------- //
  const CrowdSaleFactory = await ethers.getContractFactory("CrowdSaleFactory");
  const crowdSaleFactory = await CrowdSaleFactory.deploy(gfxDAO, gfxConstants);
  await crowdSaleFactory.deployed();
  logToFile(
    `---- ${crowdSaleFactory.address} ---> GuildFX Crowsale Factory\n`,
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
