/**
 * Script to deploy the a Lootbox's CrowdsaleFactory contract
 *
 * Run this script as:
 * npm run deploy:testnet:crowdsale-factory
 * OR
 * npm run deploy:rinkeby:guild-factory (not yet configured)
 *
 * After running this script, there are a few steps the Lootbox admins need to do in order to get Guilds onboarded:
 * 1. Lootbox DAO to call .crowdsaleFactory.sol `.whitelistGFXStaff()` function [OPTIONAL as the DAO should already have GFX_STAFF permissions and can whitelist themselves]
 *    to enable a Lootbox staff to manage the guilds.
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
import { sleep } from "@wormgraph/helpers";
import { logToFile } from "./helpers/logger";
import { baseMetadataPath } from "./helpers/ticketMetadata";
import { manifest } from "./manifest";

const LOG_FILE_PATH = `${__dirname}/logs/deployLootboxEscrowFactory_log_${Date.now()}_${
  network.name
}_${network.config.chainId}.dev.txt`;

/**
 * -------------------- INITIALIZATION --------------------
 */
const defaultFee = ethers.utils.parseUnits("0.032", 8 /* fee decimals */);

// const LootboxDAO = "0x26dE296ff2DF4eA26aB688B8680531D2B1Bb461F"
// const LootboxGrandTreasury = "0x3D18304497e214F7F4760756D9F20061DC0699b3"
// const nativeTokenPriceFeed = "0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526"

/**
 * -------------------- DEPLOY SCRIPT --------------------
 */
async function main() {
  const chainIdHex = `0x${network.config.chainId?.toString(16)}`;

  // find the chain in the manifest
  const chain = manifest.chains.find(
    (chainRaw) => chainRaw.chainIdHex === chainIdHex
  );

  if (!chain) {
    throw new Error(`Chain ${chainIdHex} not found in manifest`);
  }

  const LootboxDAO =
    manifest.openZeppelin.multiSigs[chain.chainIdHex].LootboxDAO.address;
  const LootboxGrandTreasury =
    manifest.openZeppelin.multiSigs[chain.chainIdHex].LootboxDAO_Treasury
      .address;

  if (!LootboxDAO || !LootboxGrandTreasury) {
    throw new Error(
      "Lootbox DAO or Lootbox Grand Treasury not found in manifest"
    );
  }

  /**
   * IMPORTANT: Our hardhat config uses "untrusted" signers with a single private key.
   *            However, we have "trusted" guild fx accounts which are secure multisigs created in Openzeppelin Defender.
   *            Thus, we prefix the untrusted accounts with "__untrusted" in these scripts. The trusted multisigs are currently
   *            configured in { addresses } from ./constants. Please read the ../README.md for more details.
   */
  const [__untrustedDeployer] = await ethers.getSigners();

  logToFile(
    ` 
  
---------- DEPLOY LOOTBOX ESCROW FACTORY (development) ----------
  
---- Script starting...

---- Network:                             ${network.name} (Hex ID = ${chainIdHex})
---- Lootbox DAO (multisig):              ${LootboxDAO}
---- Lootbox Grand Treasury (multisig):   ${LootboxGrandTreasury}
---- Default Fee:                         ${defaultFee}
---- Deployer (UNTRUSTED):                ${__untrustedDeployer.address}
---- Base Metadata Path:                  ${baseMetadataPath}


  \n`,
    LOG_FILE_PATH
  );

  // --------- Deploy CrowdSale Factory --------- //
  const LootboxFactory = await ethers.getContractFactory(
    "LootboxEscrowFactory"
  );
  const lootboxFactory = await LootboxFactory.deploy(
    LootboxDAO,
    defaultFee.toString(),
    LootboxGrandTreasury,
    baseMetadataPath
  );
  await lootboxFactory.deployed();
  logToFile(
    `---- ${lootboxFactory.address} ---> Lootbox Escrow Factory \n`,
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
