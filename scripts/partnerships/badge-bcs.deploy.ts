/**
 * Script to deploy the a Lootbox's CrowdsaleFactory contract
 *
 * Run this script as:
 * npm run deploy:testnet:badge-factory
 *
 */

import { ethers, network } from "hardhat";
import { sleep } from "@wormgraph/helpers";
import { logToFile } from "../helpers/logger";
import { USDT, USDT__factory } from "../../typechain";

const LOG_FILE_PATH = `${__dirname}/../logs/badgeFactory_deploylog_${Date.now()}_${
  network.name
}_${network.config.chainId}.dev.txt`;

/**
 * -------------------- INITIALIZATION --------------------
 */
const LootboxDEV = "0x5cf72D125e8be3eD2311E50cbbbc4d09C746516e";
let PaymentToken = "0x000000000000000000000000000000000000000";
const chainIdHex = "0x61";
const baseTokenURI = "https://images.com";

/**
 * -------------------- DEPLOY SCRIPT --------------------
 */
async function main() {
  if (!chainIdHex) {
    throw new Error(`Chain ID "${chainIdHex}" was invalid`);
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
   
 ---------- DEPLOY BADGE Factory for BlockchainSpace ----------
   
 ---- Script starting...
 
 ---- Network:                             ${network.name} (Hex ID = ${chainIdHex})
 ---- Lootbox DEV:                         ${LootboxDEV}
 ---- Deployer (UNTRUSTED):                ${__untrustedDeployer.address}
 
   \n`,
    LOG_FILE_PATH
  );

  const USDC_STARTING_BALANCE = "200000000000000000000";

  logToFile(
    ` 
 Deploying USDC Starting Balance of ${USDC_STARTING_BALANCE}
 
   \n`,
    LOG_FILE_PATH
  );

  //   const Usdc = await ethers.getContractFactory("USDC");
  //   const usdc_stablecoin = await Usdc.deploy(0);
  //   logToFile(
  //     `
  //  Deployed USDC to ${usdc_stablecoin.address}

  //    \n`,
  //     LOG_FILE_PATH
  //   );
  //   await usdc_stablecoin.mint(
  //     LootboxDEV,
  //     ethers.BigNumber.from(USDC_STARTING_BALANCE)
  //   );

  logToFile(
    ` 
 Minted ${USDC_STARTING_BALANCE} to ${LootboxDEV}
 
   \n`,
    LOG_FILE_PATH
  );

  // PaymentToken = usdc_stablecoin.address;

  // --------- Deploy CrowdSale Factory --------- //
  const BadgeBCS = await ethers.getContractFactory("BadgeFactoryBCS");
  const badgeFactoryBCS = await BadgeBCS.deploy(
    LootboxDEV,
    // PaymentToken,
    baseTokenURI
  );
  await badgeFactoryBCS.deployed();
  logToFile(
    `---- ${badgeFactoryBCS.address} ---> Badge Factory for BlockchainSpace \n`,
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
