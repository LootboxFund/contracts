import { ethers, network } from "hardhat";
import { sleep } from "@wormgraph/helpers";
import { logToFile } from "./helpers/logger";
import { manifest } from "./manifest";
import { baseMetadataPath } from "./helpers/ticketMetadata";

const LOG_FILE_PATH = `${__dirname}/logs/deployPartyBasketFactory_log_${Date.now()}_${
  network.name
}_${network.config.chainId}.dev.txt`;

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

  const Whitelister =
    manifest.lootbox.contracts[chain.chainIdHex].PartyBasketFactory.whitelister;

  if (!LootboxDAO || !Whitelister) {
    throw new Error("Lootbox DAO or whitelister manifest");
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
  
---------- DEPLOY PARTY BASKET FACTORY (development) ----------
  
---- Script starting...

---- Network:                             ${network.name} (Hex ID = ${chainIdHex})
---- Lootbox DAO (multisig):              ${LootboxDAO}
---- Whitelister:                         ${Whitelister}
---- Deployer (UNTRUSTED):                ${__untrustedDeployer.address}
---- Base Metadata Path:                  ${baseMetadataPath}

  \n`,
    LOG_FILE_PATH
  );

  // --------- Deploy CrowdSale Factory --------- //
  const PartyBasketFactory = await ethers.getContractFactory(
    "PartyBasketFactory"
  );
  const partyBasketFactory = await PartyBasketFactory.deploy(
    LootboxDAO,
    Whitelister
  );
  await partyBasketFactory.deployed();
  logToFile(
    `---- ${partyBasketFactory.address} ---> Party Basket Factory \n`,
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
