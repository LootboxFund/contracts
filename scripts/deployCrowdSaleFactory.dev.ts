// We require the Hardhat Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
//
// When running the script with `npx hardhat run <script>` you'll find the Hardhat
// Runtime Environment's members available in the global scope.
//
// THIS SCRIPT ASSUMES YOU HAVE RAN ./deployCrowdSaleFactory.dev.ts which would have
// created a constants file which we hardcode for now

import { ethers, network } from "hardhat";
import { sleep } from "./helpers/helpers";
import { logToFile } from "./helpers/logger";

/**
 * @todo dynamically load these paramaters, or store in global config file somewhere
 * currently, you need to manually find the following from ./logs/deployCrowdSaleFactory_log_xxxx
 * https://linear.app/guildfx/issue/GUI-75/generalize-dev-deployment-proceedure
 *      1. GuildFX Constants Contract Address
 *      2. GuildFX Gamer Token Address
 */
const CONSTANTS_ADDRESS = "0xAF761E630B936F4892c05C1aBcfD614559AdD35e";
const GUILD_TOKEN_ADDRESS = "0xe5faebe2dbc746a0fe99fe2924db1c6bf2ac3160";
const DEFAULT_GUILD_TOKEN_STARTING_PRICE = "7000000"; // 7 USD cents

const LOG_FILE_PATH = `${__dirname}/logs/deployCrowdSaleFactory_log_${Date.now()}.dev.txt`;

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
  
---------- DEPLOY CROWDSALE FACTORY (development) ----------
  
---- Script starting

---- Network = ${network.name} (${network.config.chainId})

  \n`,
    LOG_FILE_PATH
  );
  logToFile(`---- ${DEPLOYER_ADDRESS} ---> Deployer Address \n`, LOG_FILE_PATH);
  logToFile(
    `---- ${GUILD_TOKEN_ADDRESS} ---> GuildFX Gamer Token \n`,
    LOG_FILE_PATH
  );
  logToFile(
    `---- ${CONSTANTS_ADDRESS} ---> GuildFX Constants \n`,
    LOG_FILE_PATH
  );
  logToFile(
    `---- ${DEFAULT_GUILD_TOKEN_STARTING_PRICE} ---> Crowdsale Default Starting Price $USD (8 decimals) \n`,
    LOG_FILE_PATH
  );

  // --------- Deploy CrowdSale Factory --------- //
  const CrowdSaleFactory = await ethers.getContractFactory("CrowdSaleFactory");
  const crowdSaleFactory = await CrowdSaleFactory.deploy(
    dao.address,
    CONSTANTS_ADDRESS
  );
  await crowdSaleFactory.deployed();
  logToFile(
    `---- ${crowdSaleFactory.address} ---> Crowsale Factory Contract Address\n`,
    LOG_FILE_PATH
  );
  await sleep();

  // --------- Create the CrowdSale --------- //
  const tx = await crowdSaleFactory
    .connect(dao)
    .createCrowdSale(
      GUILD_TOKEN_ADDRESS,
      guildDao.address,
      guildDev.address,
      guildTreasury.address,
      DEFAULT_GUILD_TOKEN_STARTING_PRICE
    );

  await tx.wait();
  // TODO Manually you will need to .whitelistMint() via the defender UI Voting Mechanism
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  logToFile(error.message, LOG_FILE_PATH);
  console.error(error);
  process.exitCode = 1;
});
